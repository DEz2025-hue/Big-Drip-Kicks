import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LoginForm } from './components/LoginForm'
import { Layout } from './components/Layout'
import { Dashboard } from './components/Dashboard'
import Inventory from './components/Inventory'
import { Sales } from './components/Sales'
import { Customers } from './components/Customers'
import { Expenses } from './components/Expenses'
import { Reports } from './components/Reports'
import { Users } from './components/Users'
import { AuditLogs } from './components/AuditLogs'
import { Categories } from './components/Categories'
import { Brands } from './components/Brands'
import { useState } from 'react'

function AppContent() {
  const { user, profile, loading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  console.log('AppContent: Auth state:', { user: !!user, profile: !!profile, loading })

  if (loading) {
    console.log('AppContent: Showing loading spinner')
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Only show login form if there's no user at all
  // If user exists but profile is null, they should still be able to access the app
  if (!user) {
    console.log('AppContent: Showing login form - no user')
    return <LoginForm />
  }

  console.log('AppContent: Rendering main app with user (profile may be null)')
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'inventory':
        return <Inventory />
      case 'sales':
        return <Sales />
      case 'customers':
        return <Customers />
      case 'expenses':
        return <Expenses />
      case 'reports':
        return <Reports />
      case 'users':
        return <Users />
      case 'audit':
        return <AuditLogs />
      case 'categories':
        return <Categories />
      case 'brands':
        return <Brands />
      default:
        return <Dashboard />
    }
  }

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App;
