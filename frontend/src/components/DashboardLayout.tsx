import { useAuthStore } from '../store/authStore';
import { useEffect, useState } from 'react';

// Importações dinâmicas para os layouts
const LayoutV1 = import('../layouts/v1.0/DashboardLayout');
const LayoutV2 = import('../layouts/v2.0/DashboardLayout');
const LayoutV3 = import('../layouts/v3.0/DashboardLayout');


const LayoutMap: Record<string, Promise<any>> = {
  'Dash 1.0': LayoutV1,
  'B.I 1.0': LayoutV2,
  'B.I IA.': LayoutV3,
  'v1.0': LayoutV1,
  'v2.0': LayoutV2,
  'v3.0': LayoutV3,
};

export default function DynamicDashboardLayout() {
  const versao = useAuthStore((s) => s.user?.versao || s.user?.layout_version || 'Dash 1.0');
  const [CurrentLayout, setCurrentLayout] = useState<React.ComponentType | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);

  useEffect(() => {
    // Aplicar a classe do layout no body para que as variáveis CSS se propaguem por todo o app
    const classMap: Record<string, string> = {
      'Dash 1.0': 'layout-v1-0',
      'B.I 1.0': 'layout-v2-0',
      'B.I IA.': 'layout-v3-0',
      'v1.0': 'layout-v1-0',
      'v2.0': 'layout-v2-0',
      'v3.0': 'layout-v3-0',
    };
    const bodyClass = classMap[versao] || 'layout-v1-0';

    document.body.classList.remove('layout-v1-0', 'layout-v2-0', 'layout-v3-0');
    document.body.classList.add(bodyClass);

    setLoadingLayout(true);
    
    const loadLayout = async () => {
      try {
        const module = await (LayoutMap[versao] || LayoutMap['Dash 1.0']);
        setCurrentLayout(() => module.default);
      } catch (error) {
        console.error(`Failed to load layout ${versao}:`, error);
        const moduleV1 = await LayoutMap['Dash 1.0'];
        setCurrentLayout(() => moduleV1.default);
      } finally {
        setLoadingLayout(false);
      }
    };
    
    loadLayout();
  }, [versao]);

  if (loadingLayout || !CurrentLayout) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center text-text-secondary">
        Carregando Layout...
      </div>
    );
  }

  return <CurrentLayout />;
}
