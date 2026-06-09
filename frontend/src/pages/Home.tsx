import { useAuthStore } from '../store/authStore'
import HomeV1 from './HomeV1'
import VisaoEstrategicaV3 from './VisaoEstrategicaV3'

export default function Home() {
  const layoutVersion = useAuthStore((s) => s.user?.layout_version || 'v1.0')

  if (layoutVersion === 'v3.0') {
    return <VisaoEstrategicaV3 />
  }

  return <HomeV1 />
}
