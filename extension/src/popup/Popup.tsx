import React, { useEffect, useState } from 'react';
import { VerificationEntry } from '../types';
import { VerificationStore } from '../storage/VerificationStore';
import { VerificationCard } from './components/VerificationCard';
import { getConfidenceLevel } from '../utils/confidence';

export default function Popup() {
  const [entries, setEntries] = useState<VerificationEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const data = await VerificationStore.getAll();
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
      await VerificationStore.clear();
      setEntries([]);
    }
  };

  const latestEntry = entries[0];
  const historyEntries = entries.slice(1);

  return (
    <div>
      <div className="header">
        <div className="brand">
          <div className="brand-logo">M</div>
          <span className="brand-name">Mayzax CRM</span>
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
          <div className="section-title">Latest Verification</div>
          {latestEntry ? (
            <VerificationCard entry={latestEntry} />
          ) : (
            <div className="empty-state">
              <span className="empty-icon">🔍</span>
              <div>No applications verified yet</div>
              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                Navigate to a job confirmation page to begin verifying.
              </div>
            </div>
          )}

          {historyEntries.length > 0 && (
            <>
              <div className="section-title" style={{ marginTop: '16px' }}>Verification History</div>
              <div className="history-list">
                {historyEntries.map(entry => {
                  const level = getConfidenceLevel(entry.confidenceScore);
                  return (
                    <div key={entry.id} className="history-item">
                      <div className="history-details">
                        <span className="history-company">{entry.company}</span>
                        <div className="history-meta">
                          <span>{entry.portal}</span>
                          <span>•</span>
                          <span>Score: {entry.confidenceScore}%</span>
                        </div>
                      </div>
                      <span className={`badge ${level.toLowerCase().replace('_', '-')}`} style={{ fontSize: '9px' }}>
                        {level === 'VERIFIED' ? 'Verified' : 'Likely'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="footer-actions">
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
