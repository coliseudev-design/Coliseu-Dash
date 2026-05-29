import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function AcessoNegado() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg-secondary flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-bg-primary border border-divider shadow-card max-w-md w-full rounded-2xl p-8 flex flex-col items-center">
        <div className="bg-danger/10 p-4 rounded-full text-danger mb-6">
          <ShieldAlert size={48} />
        </div>
        
        <h1 className="text-2xl font-bold text-text-primary mb-3">
          Acesso Negado
        </h1>
        
        <p className="text-text-secondary text-sm leading-relaxed mb-8">
          Você não tem permissão para acessar esta seção. Entre em contato com o administrador do sistema para solicitar permissão de acesso a este layout ou módulo.
        </p>

        <button
          onClick={() => navigate('/')}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-lg font-medium transition-all shadow-sm"
        >
          <ArrowLeft size={16} />
          <span>Voltar ao Início</span>
        </button>
      </div>
    </div>
  )
}
