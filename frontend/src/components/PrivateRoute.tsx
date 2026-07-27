import { Navigate, useLocation } from 'react-router-dom'
import { tokenStorage } from '@/api/token-storage'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

export function PrivateRoute({ children }: { children: React.ReactNode }) {
    const token = tokenStorage.getAccessToken();
    const user = useCurrentUser();
    const location = useLocation();

    if (!token) {
        return <Navigate to={"/login"} replace />
    }

    if (user?.must_change_password && location.pathname !== "/force-change-password") {
        return <Navigate to={"/force-change-password"} replace />
    }

    return <>{children}</>
}