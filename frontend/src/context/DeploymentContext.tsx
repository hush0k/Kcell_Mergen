import React, { createContext, useContext, useEffect, useState } from 'react';

export type DeploymentMode = 'full' | 'lite';

type DeploymentContextValue = {
  deployment: DeploymentMode;
  loading: boolean;
};

const DeploymentContext = createContext<DeploymentContextValue>({
  deployment: 'full',
  loading: true,
});

export const DeploymentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deployment, setDeployment] = useState<DeploymentMode>('full');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/public/config')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { deployment?: string }) => {
        setDeployment(d.deployment === 'lite' ? 'lite' : 'full');
      })
      .catch(() => {
        setDeployment('full');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <DeploymentContext.Provider value={{ deployment, loading }}>
      {children}
    </DeploymentContext.Provider>
  );
};

export function useDeployment(): DeploymentContextValue {
  return useContext(DeploymentContext);
}
