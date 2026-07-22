import React from 'react';
import { ConfidenceLevel } from '../../types';

interface Props {
  level: ConfidenceLevel;
}

export function ConfidenceBadge({ level }: Props) {
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
