import { Suspense } from 'react'
import NovoCasoForm from '@/components/NovoCasoForm'

export default function NovoCasoPage() {
  return (
    <Suspense fallback={null}>
      <NovoCasoForm />
    </Suspense>
  )
}
