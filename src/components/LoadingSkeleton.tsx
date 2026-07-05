import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
}

export default function LoadingSkeleton({ lines = 3 }: LoadingSkeletonProps) {
  return (
    <div className="loading-skeleton">
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="loading-line" />
      ))}
    </div>
  );
}
