import React from 'react'
import { Package } from 'lucide-react'

export default function Estoque() {
  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-xl font-semibold text-text-primary">Estoque</h2>
          <p className="text-text-secondary text-sm">Controle de inventário e movimentações.</p>
        </div>
      </div>
      
      <div className="bg-bg-primary rounded-2xl shadow-sm border border-border p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-brand-500" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">Módulo em Desenvolvimento</h3>
        <p className="text-text-secondary max-w-sm">
          A integração com o seu sistema de estoque está sendo finalizada. Em breve você poderá acompanhar tudo por aqui.
        </p>
      </div>
    </div>
  )
}
