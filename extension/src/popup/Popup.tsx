import React, { useEffect, useState } from 'react';
import { VerificationEntry } from '../verification/types';
import { VerificationStoreV2 } from '../storage/VerificationStoreV2';
import { VerificationCard } from './components/VerificationCard';
import { ENGINE_VERSION_NAME } from '../verification/engine/EngineConfig';

export default function Popup() {
  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await VerificationStoreV2.getAll();
      setEntries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClear = async () => {
    if (window.confirm('Are you sure you want to clear the verification history?')) {
      await VerificationStoreV2.clear();
      setEntries([]);
    }
  };

  const latestEntry = entries[0];
  const historyEntries = entries.slice(1);

  const getConfidenceLabel = (entry: VerificationEntry) => {
    if (entry.confidence) return entry.confidence;
    const score = entry.score || entry.confidenceScore || 0;
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
  };

  const getScore = (entry: VerificationEntry) => entry.score || entry.confidenceScore || 0;

  return (
    <div>
      <div className="header">
        <div className="brand">
          <div className="brand-logo">M</div>
          <span className="brand-name">Mayzax CRM</span>
          <span style={{ fontSize: '9px', color: '#64748B', marginLeft: '6px', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>v{ENGINE_VERSION_NAME}</span>
        </div>
        <div className="status-indicator">
          <span className={`dot ${entries.length === 0 ? 'idle' : ''}`}></span>
          <span>{entries.length > 0 ? 'Active' : 'Listening'}</span>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>Loading...</div>
      ) : (
        <>
          <div className="section-title">Latest Verification (Enterprise v1)</div>
          {latestEntry ? (
            <VerificationCard entry={latestEntry} />
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <div>No applications verified yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Navigate to a job confirmation page to begin verifying.
              </div>
              <div style={{ fontSize: '10px', marginTop: '8px', color: '#64748B' }}>
                Supports Greenhouse, Lever, Workday, LinkedIn, Indeed & 15+ ATS
              </div>
            </div>
          )}

          {historyEntries.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: '16px' }}>Verification History</div>
              <div className="history-list">
                {historyEntries.map(entry => {
                  const confidence = getConfidenceLabel(entry);
                  const score = getScore(entry);
                  const levelClass = confidence === 'HIGH' ? 'verified' : confidence === 'MEDIUM' ? 'possible' : 'not-verified';
                  return (
                    <div key={entry.id} className="history-item">
                      <div className="history-details">
                        <span className="history-company" title={entry.company}>{entry.company || 'Unknown Company'}</span>
                        <div className="history-meta">
                          <span>{entry.portal}</span>
                          <span>•</span>
                          <span>Score: {score}%</span>
                          <span>•</span>
                          <span>{confidence}</span>
                          {entry.applicationReference && (
                            <>
                              <span>•</span>
                              <span title={entry.applicationReference}>{entry.applicationReference.slice(0, 12)}</span>
                            </>
                          )}
                        </div>
                        {entry.fraudSignals && entry.fraudSignals.length > 0 && (
                          <div style={{ fontSize: '9px', color: '#EF4444', marginTop: '2px' }}>
                            ⚠️ {entry.fraudSignals.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </div>
                      <span className={`badge ${levelClass}`} style={{ fontSize: '9px' }}>
                        {confidence === 'HIGH' ? 'Verified' : confidence === 'MEDIUM' ? 'Suspicious' : 'Rejected'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="footer-actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: '#475569' }}>
              {entries.length} cached • Enterprise v1 • HMAC secured
            </span>
            {entries.length > 0 && (
              <button className="btn btn-danger" onClick={handleClear}>
                Clear Cache
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
