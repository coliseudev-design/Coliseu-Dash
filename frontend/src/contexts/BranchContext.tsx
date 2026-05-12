import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '../services/api'

export interface Filial {
  id: number
  empresa_erp: number
  depto_id: number
  centro_custo: number | null
  nome: string
  documento: string | null
  is_default: boolean
}

interface BranchContextType {
  filiais: Filial[]
  selectedBranch: number | 'todas'
  setSelectedBranch: (id: number | 'todas') => void
  isLoading: boolean
}

const BranchContext = createContext<BranchContextType>({
  filiais: [],
  selectedBranch: 'todas',
  setSelectedBranch: () => {},
  isLoading: false,
})

export function BranchProvider({ children }: { children: ReactNode }) {
  const [filiais, setFiliais] = useState<Filial[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Restaurar seleção do localStorage
  const [selectedBranch, setSelectedBranchState] = useState<number | 'todas'>(() => {
    const stored = localStorage.getItem('coliseu:branch')
    if (stored === 'todas' || stored === null) return 'todas'
    const num = parseInt(stored, 10)
    return isNaN(num) ? 'todas' : num
  })

  const setSelectedBranch = (id: number | 'todas') => {
    setSelectedBranchState(id)
    localStorage.setItem('coliseu:branch', String(id))
  }

  useEffect(() => {
    const fetchFiliais = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get('/filiais')
        
        // O backend retorna um array diretamente: res.json(rows)
        const filiaisList = Array.isArray(data) ? data : (data.filiais || [])
        setFiliais(filiaisList)

        // Se só tem 1 filial, selecionar ela automaticamente
        if (filiaisList.length === 1) {
          setSelectedBranch(filiaisList[0].depto_id)
        }
      } catch (err) {
        // Se não tem filiais cadastradas ainda, usa 'todas' sem erro
        setFiliais([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchFiliais()
  }, [])

  return (
    <BranchContext.Provider value={{ filiais, selectedBranch, setSelectedBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  )
}

/** Hook de acesso ao contexto de filiais */
export function useBranch() {
  return useContext(BranchContext)
}

/**
 * Retorna o valor de depto_id para injetar nas queries da API.
 * Se 'todas', retorna undefined (sem filtro).
 */
export function useBranchParam(): { depto_id?: number; centro_custo?: number } {
  const { selectedBranch, filiais } = useBranch()
  if (selectedBranch === 'todas') return {}
  
  const filial = filiais.find(f => f.depto_id === selectedBranch)
  return { 
    depto_id: selectedBranch,
    ...(filial?.centro_custo ? { centro_custo: filial.centro_custo } : {})
  }
}
