import React from 'react';
import { VerificationEntry } from '../../types';
import { ConfidenceBadge } from './ConfidenceBadge';
import { getConfidenceLevel } from '../../utils/confidence';

interface Props {
  entry: VerificationEntry;
}

export function VerificationCard({ entry }: Props) {
  const level = getConfidenceLevel(entry.confidenceScore);
  const dateStr = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const getCardClassName = () => {
    return `card ${level.toLowerCase().replace('_', '-')}`;
  };

  return (
    <div className={getCardClassName()}>
      <div className="card-header">
        <div>
          <div className="company-name" title={entry.company}>{entry.company}</div>
          <div className="job-title" title={entry.jobTitle}>{entry.jobTitle}</div>
        </div>
        <ConfidenceBadge level={level} />
      </div>
      <div className="meta-row">
        <span className="portal-badge">{entry.portal}</span>
        <span>{dateStr}</span>
      </div>
    </div>
  );
}
