import { Navigate } from 'react-router-dom'
import { tokenStorage } from '@/api/token-storage'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
    const token = tokenStorage.getAccessToken();
    return token ? <>{children}</> : <Navigate to={"/login"} replace />
}