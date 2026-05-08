import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';

// Importações dinâmicas para os layouts
const LayoutV1 = import('../layouts/v1.0/DashboardLayout');
const LayoutV2 = import('../layouts/v2.0/DashboardLayout');
const LayoutV3 = import('../layouts/v3.0/DashboardLayout');

const LayoutMap: Record<string, Promise<any>> = {
  'v1.0': LayoutV1,
  'v2.0': LayoutV2,
  'v3.0': LayoutV3,
};

export default function DynamicDashboardLayout() {
  const layoutVersion = useAuthStore((s) => s.user?.layout_version || 'v1.0');
  const [CurrentLayout, setCurrentLayout] = useState<React.ComponentType | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);

  useEffect(() => {
    // Aplicar a classe do layout no body para que as variáveis CSS se propaguem por todo o app
    document.body.classList.remove('layout-v1-0', 'layout-v2-0', 'layout-v3-0');
    document.body.classList.add(`layout-${layoutVersion.replace('.', '-')}`);

    setLoadingLayout(true);
    
    const loadLayout = async () => {
      try {
        const module = await (LayoutMap[layoutVersion] || LayoutMap['v1.0']);
        setCurrentLayout(() => module.default);
      } catch (error) {
        console.error(`Failed to load layout ${layoutVersion}:`, error);
        const moduleV1 = await LayoutMap['v1.0'];
        setCurrentLayout(() => moduleV1.default);
      } finally {
        setLoadingLayout(false);
      }
    };
    
    loadLayout();
  }, [layoutVersion]);

  if (loadingLayout || !CurrentLayout) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center text-text-secondary">
        Carregando Layout...
      </div>
    );
  }

  return <CurrentLayout />;
}
