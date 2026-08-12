import { SubmissionEvidence, JobPortal } from '../types';

export interface TargetApplicationContext {
  jobTitle?: string;
  companyName?: string;
  jobUrl: string;
  portalDomain: string;
}

export class SubmissionObserver {
  private evidence!: SubmissionEvidence;
  private targetContext: TargetApplicationContext | null = null;
  private preSubmitApplications: Array<{ title?: string; company?: string; status?: string; date?: string; id?: string }> = [];
  private observer: MutationObserver | null = null;
  private timeoutId: number | null = null;
  private onCompleteCallback: ((evidence: SubmissionEvidence) => void) | null = null;
  private isObserving = false;
  private formInputsState: Map<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, string> = new Map();

  // Configuration options
  private timeoutMs = 12000; // configurable 10-15s

  constructor(timeoutMs?: number) {
    if (timeoutMs) this.timeoutMs = timeoutMs;
    this.resetEvidence();
  }

  private resetEvidence() {
    this.evidence = {
      submitDetected: false,
      requestObserved: false,
      responseObserved: false,
      redirectDetected: false,
      confirmationDetected: false,
      formResetDetected: false,
      dashboardDetected: false,
      newApplicationDetected: false,
      updatedApplicationDetected: false,
      timestamp: Date.now()
    };
  }

  /**
   * Starts observing for form submissions and user clicks.
   */
  start(onComplete: (evidence: SubmissionEvidence) => void) {
    if (this.isObserving) return;
    this.isObserving = true;
    this.onCompleteCallback = onComplete;
    this.resetEvidence();

    // 1. Capture target application context
    this.captureTargetContext();

    // 2. Setup submit/click listeners
    document.addEventListener('submit', this.handleSubmitEvent, true);
    document.addEventListener('click', this.handleClickEvent, true);

    // 3. Inject network interceptor
    this.injectNetworkInterceptor();

    // 4. Set up custom event listeners for network activity
    window.addEventListener('MayzaxNetReq', this.handleNetworkRequest as any);
    window.addEventListener('MayzaxNetRes', this.handleNetworkResponse as any);

    // Track initial form fields state
    this.trackFormFields();
  }

  /**
   * Stops observing and cleans up all listeners and observers.
   */
  stop() {
    this.isObserving = false;
    document.removeEventListener('submit', this.handleSubmitEvent, true);
    document.removeEventListener('click', this.handleClickEvent, true);
    window.removeEventListener('MayzaxNetReq', this.handleNetworkRequest as any);
    window.removeEventListener('MayzaxNetRes', this.handleNetworkResponse as any);

    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Clean up injected script if possible
    const script = document.getElementById('mayzax-net-interceptor');
    if (script) script.remove();
  }

  private captureTargetContext() {
    let jobTitle = '';
    let companyName = '';

    // Attempt to extract job title and company name
    const titleEl = document.querySelector('h1, [class*="job-title" i], [class*="position" i], [id*="job-title" i]');
    if (titleEl) jobTitle = titleEl.textContent?.trim() || '';

    const companyEl = document.querySelector('[class*="company" i], [id*="company" i], [class*="employer" i]');
    if (companyEl) companyName = companyEl.textContent?.trim() || '';

    if (!jobTitle) {
      jobTitle = document.title;
    }

    this.targetContext = {
      jobTitle,
      companyName,
      jobUrl: window.location.href,
      portalDomain: window.location.hostname
    };
  }

  private trackFormFields() {
    this.formInputsState.clear();
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(el => {
      const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (input.type !== 'submit' && input.type !== 'button') {
        this.formInputsState.set(input, input.value || '');
      }
    });
  }

  private handleSubmitEvent = (event: Event) => {
    this.triggerSubmissionAttempt();
  };

  private handleClickEvent = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const btn = target.closest('button, input[type="submit"], input[type="button"], [role="button"]');
    if (btn) {
      const text = (btn.textContent || (btn as HTMLInputElement).value || '').trim().toLowerCase();
      if (/submit|apply|confirm|send|agree|continue/i.test(text)) {
        this.triggerSubmissionAttempt();
      }
    }
  };

  private triggerSubmissionAttempt() {
    if (this.evidence.submitDetected) return;
    this.evidence.submitDetected = true;
    this.evidence.timestamp = Date.now();

    // Take snapshot of current dashboard/applications if we are on a dashboard already
    if (this.isDashboardUrl(window.location.href)) {
      this.preSubmitApplications = this.scanDashboardApplications();
    }

    // Start mutation observer to capture success UI/modals/toasts
    this.setupMutationObserver();

    // Start observation window countdown
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      this.finishObservation();
    }, this.timeoutMs);
  }

  private handleNetworkRequest = (event: CustomEvent<{ url: string; method: string }>) => {
    if (!this.evidence.submitDetected) {
      // Auto-trigger submission attempt if network request looks like application submit
      if (event.detail.method === 'POST' || event.detail.method === 'PUT') {
        if (/apply|submit|jobs|applications|register/i.test(event.detail.url)) {
          this.triggerSubmissionAttempt();
        }
      }
    }

    if (this.evidence.submitDetected) {
      this.evidence.requestObserved = true;
      this.evidence.requestMethod = event.detail.method;
      this.evidence.requestUrl = event.detail.url;
    }
  };

  private handleNetworkResponse = (event: CustomEvent<{ url: string; status: number; text: string }>) => {
    if (!this.evidence.submitDetected) return;

    this.evidence.responseObserved = true;
    this.evidence.responseStatus = event.detail.status;

    // Strong network response evidence check
    if (event.detail.status >= 200 && event.detail.status < 300) {
      const body = event.detail.text || '';
      // Try to find reference ID
      const refMatch = body.match(/"(?:id|reference|confirmation|app_id)"\s*:\s*"([A-Za-z0-9-_]+)"/);
      if (refMatch && refMatch[1]) {
        this.evidence.applicationReference = refMatch[1];
      }
      
      // Look for confirmation/success indications in response body
      if (/success|applied|submitted|received|confirm/i.test(body) && !/error|invalid|fail/i.test(body)) {
        this.evidence.confirmationDetected = true;
      }
    }
  };

  private setupMutationObserver() {
    if (this.observer) this.observer.disconnect();

    this.observer = new MutationObserver((mutations) => {
      // 1. Detect toast/modal success messages
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as HTMLElement;
            const text = el.textContent || '';
            
            // Check for success keywords in newly added elements
            if (/application submitted|thanks for applying|your application has been received|application completed|successfully applied|thank you for/i.test(text.toLowerCase())) {
              this.evidence.confirmationDetected = true;
              this.evidence.confirmationText = text.trim().slice(0, 500);

              // Try extracting application ID
              const refMatch = text.match(/(?:application\s*(?:id|reference|number)|ref\s*#?)\s*[:#]?\s*([A-Z0-9-]{6,})/i);
              if (refMatch && refMatch[1]) {
                this.evidence.applicationReference = refMatch[1];
              }
            }
          }
        });
      }

      // 2. Form reset check
      this.checkFormReset();

      // 3. Navigation / Dashboard check
      this.checkNavigation();
    });

    this.observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  private checkFormReset() {
    if (this.evidence.formResetDetected) return;

    let totalInputs = 0;
    let clearedInputs = 0;

    this.formInputsState.forEach((initialVal, input) => {
      // Only track inputs that actually had values
      if (initialVal.trim().length > 0) {
        totalInputs++;
        if (!input.value || input.value.trim().length === 0) {
          clearedInputs++;
        }
      }
    });

    // If more than 80% of previously filled inputs became empty, form reset detected
    if (totalInputs > 0 && clearedInputs / totalInputs >= 0.8) {
      this.evidence.formResetDetected = true;
    }
  }

  private checkNavigation() {
    const currentUrl = window.location.href;
    if (this.targetContext && currentUrl !== this.targetContext.jobUrl) {
      this.evidence.redirectDetected = true;
      this.evidence.redirectUrl = currentUrl;

      if (this.isDashboardUrl(currentUrl)) {
        this.evidence.dashboardDetected = true;
        this.matchDashboardApplications();
      }
    }
  }

  private isDashboardUrl(url: string): boolean {
    const lower = url.toLowerCase();
    return lower.includes('/dashboard') || 
           lower.includes('/applications') || 
           lower.includes('/my-applications') || 
           lower.includes('/applied') || 
           lower.includes('/candidate/home') ||
           lower.includes('/job-applications');
  }

  private scanDashboardApplications(): Array<{ title?: string; company?: string; status?: string; date?: string; id?: string }> {
    const list: Array<{ title?: string; company?: string; status?: string; date?: string; id?: string }> = [];

    // Generic dashboard application list container scanning
    const selectors = [
      '.application-card', '.application-row', 'tr', '.job-card', '.dashboard-item',
      '[class*="application" i]', '[class*="job" i]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          const text = el.textContent || '';
          if (text.length > 5 && text.length < 500) {
            // Attempt to extract title, company, status, date
            const titleEl = el.querySelector('h1, h2, h3, h4, .title, [class*="title" i], [class*="job" i]');
            const statusEl = el.querySelector('.status, [class*="status" i], [class*="state" i]');
            const dateEl = el.querySelector('.date, [class*="date" i], [class*="time" i], [class*="applied" i]');
            const companyEl = el.querySelector('.company, [class*="company" i], [class*="employer" i]');

            const title = titleEl?.textContent?.trim() || '';
            const status = statusEl?.textContent?.trim() || '';
            const date = dateEl?.textContent?.trim() || '';
            const company = companyEl?.textContent?.trim() || '';

            if (title || company) {
              list.push({ title, company, status, date });
            }
          }
        });
        if (list.length > 0) break;
      }
    }

    return list;
  }

  private matchDashboardApplications() {
    if (!this.targetContext) return;

    const currentApplications = this.scanDashboardApplications();
    const targetTitle = this.normalize(this.targetContext.jobTitle || '');
    const targetCompany = this.normalize(this.targetContext.companyName || '');

    // A. New application appears
    const newApps = currentApplications.filter(curr => {
      const currTitle = this.normalize(curr.title || '');
      const currCompany = this.normalize(curr.company || '');
      
      const titleMatch = targetTitle.includes(currTitle) || currTitle.includes(targetTitle);
      const companyMatch = targetCompany.includes(currCompany) || currCompany.includes(targetCompany);

      if (titleMatch || companyMatch) {
        const wasPresent = this.preSubmitApplications.some(pre => {
          return this.normalize(pre.title || '') === currTitle && this.normalize(pre.company || '') === currCompany;
        });
        return !wasPresent;
      }
      return false;
    });

    if (newApps.length > 0) {
      this.evidence.newApplicationDetected = true;
      this.evidence.matchedJobTitle = true;
      this.evidence.matchedCompany = true;
      if (newApps[0].status) {
        this.evidence.confirmationText = `New Application detected: ${newApps[0].title} - Status: ${newApps[0].status}`;
      }
      return;
    }

    // B. Existing application changes state
    const updatedApps = currentApplications.filter(curr => {
      const currTitle = this.normalize(curr.title || '');
      const currCompany = this.normalize(curr.company || '');
      
      const titleMatch = targetTitle.includes(currTitle) || currTitle.includes(targetTitle);
      const companyMatch = targetCompany.includes(currCompany) || currCompany.includes(targetCompany);

      if (titleMatch || companyMatch) {
        const preItem = this.preSubmitApplications.find(pre => {
          return this.normalize(pre.title || '') === currTitle && this.normalize(pre.company || '') === currCompany;
        });
        if (preItem) {
          const statusChanged = preItem.status !== curr.status;
          const dateChanged = preItem.date !== curr.date;
          return statusChanged || dateChanged;
        }
      }
      return false;
    });

    if (updatedApps.length > 0) {
      this.evidence.updatedApplicationDetected = true;
      this.evidence.matchedJobTitle = true;
      this.evidence.matchedCompany = true;
    }
  }

  private normalize(str: string): string {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  }

  private injectNetworkInterceptor() {
    // Registered via manifest in MAIN world, no inline script injection needed (solves CSP issue)
  }

  private finishObservation() {
    this.stop();
    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.evidence);
    }
  }
}
