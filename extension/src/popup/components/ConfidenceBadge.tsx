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

import { VERIFICATION_THRESHOLD } from '../../verification/engine/EngineConfig';

interface PropsV2 {
  confidence: VerificationConfidence;
  score: number;
}

export function ConfidenceBadgeV2({ confidence, score }: PropsV2) {
  const isVerified = score > VERIFICATION_THRESHOLD;
  const label = isVerified ? 'Verified' : 'Not Verified';
  const className = isVerified ? 'verified' : 'not-verified';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <span className={`badge ${className}`}>
        {label} {score}%
      </span>
    </div>
  );
}
