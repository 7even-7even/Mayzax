import React from 'react';
import { ConfidenceLevel } from '../../verification/types';
import { VerificationConfidence } from '../../verification/types';

interface PropsLegacy {
  level: ConfidenceLevel;
}

export function ConfidenceBadge({ level }: PropsLegacy) {
  const getLabel = () => {
    switch (level) {
      case 'VERIFIED': return 'Verified';
      case 'VERY_LIKELY': return 'Very Likely';
      case 'POSSIBLE': return 'Possible';
      case 'NOT_VERIFIED': return 'Not Verified';
    }
  };

  const getClassName = () => {
    return `badge ${level.toLowerCase().replace('_', '-')}`;
  };

  return (
    <span className={getClassName()}>
      {getLabel()}
    </span>
  );
}

interface PropsV2 {
  confidence: VerificationConfidence;
  score: number;
}

export function ConfidenceBadgeV2({ confidence, score }: PropsV2) {
  const label = confidence === 'HIGH' ? 'Verified' : confidence === 'MEDIUM' ? 'Suspicious' : 'Rejected';
  const className = confidence === 'HIGH' ? 'verified' : confidence === 'MEDIUM' ? 'possible' : 'not-verified';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span className={`badge ${className}`}>
        {label} {score}%
      </span>
      <span style={{ fontSize: '9px', color: '#64748B' }}>{confidence}</span>
    </div>
  );
}
