import React from 'react';
import { VerificationEntry } from '../../verification/types';
import { ConfidenceBadgeV2 } from './ConfidenceBadge';

interface Props {
  entry: VerificationEntry;
}

export function VerificationCard({ entry }: Props) {
  const score = entry.score || entry.confidenceScore || 0;
  const confidence = entry.confidence || (score >= 80 ? 'HIGH' : score >= 50 ? 'MEDIUM' : 'LOW');
  const dateStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const levelClass = confidence === 'HIGH' ? 'verified' : confidence === 'MEDIUM' ? 'possible' : 'not-verified';

  return (
    <div className={`card ${levelClass}`}>
      <div className="card-header">
        <div style={{ maxWidth: '180px' }}>
          <div className="company-name" title={entry.company}>{entry.company || 'Unknown Company'}</div>
          <div className="job-title" title={entry.jobTitle}>{entry.jobTitle || entry.pageTitle?.slice(0, 50) || 'Job Application'}</div>
        </div>
        <ConfidenceBadgeV2 confidence={confidence as any} score={score} />
      </div>
      
      <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '8px' }}>
        {entry.evidence?.hostname && (
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={entry.evidence.hostname}>
            🌐 {entry.evidence.hostname}{entry.evidence.pathname?.slice(0, 30)}
          </div>
        )}
        {entry.applicationReference && (
          <div style={{ marginTop: '4px' }}>
            🔑 <span style={{ color: '#F8FAFC', fontWeight: 600 }}>{entry.applicationReference}</span>
          </div>
        )}
        {entry.evidence?.confirmationText && (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748B', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            "{entry.evidence.confirmationText.slice(0, 120)}..."
          </div>
        )}
      </div>

      {entry.reasons && entry.reasons.length > 0 && (
        <div style={{ fontSize: '10px', color: '#64748B', marginBottom: '8px' }}>
          <strong style={{ color: '#94A3B8' }}>Reasons:</strong>
          <ul style={{ margin: '4px 0 0 12px', padding: 0 }}>
            {entry.reasons.slice(0, 3).map((r, i) => (
              <li key={i} style={{ marginBottom: '2px' }}>{r.slice(0, 80)}</li>
            ))}
          </ul>
        </div>
      )}

      {entry.fraudSignals && entry.fraudSignals.length > 0 && (
        <div style={{ fontSize: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '6px', borderRadius: '6px', marginBottom: '8px', color: '#F87171' }}>
          ⚠️ Fraud signals: {entry.fraudSignals.join(', ')}
        </div>
      )}

      <div className="meta-row">
        <span className="portal-badge">{entry.portal}</span>
        <span>{dateStr}</span>
        {entry.version && <span>v{entry.version}</span>}
        {entry.verificationHash && <span title={entry.verificationHash}>hash: {entry.verificationHash.slice(0, 8)}...</span>}
      </div>
    </div>
  );
}
