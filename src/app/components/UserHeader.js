"use client";

import React from 'react';

export default function UserHeader({ 
  isUserLoggedIn, 
  hasTokens, 
  userAvatar, 
  connectedGoogleEmail, 
  userEmail,
  userName,
  handleLogout 
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2>Dados do Cadastro</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* STATE 1: Logged in but needs to connect Google */}
        {isUserLoggedIn && !hasTokens && (
            <>
                <button 
                    type="button"
                    onClick={() => window.location.href = '/api/auth/google/initiate'}
                    style={{ 
                        background: 'white', 
                        border: '1px solid #dadce0', 
                        borderRadius: '4px',
                        color: '#3c4043', 
                        cursor: 'pointer', 
                        padding: '8px 12px', 
                        fontSize: '13px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Conectar Google Agenda
                </button>
                <button 
                    onClick={handleLogout} 
                    type="button"
                    style={{ 
                        background: 'none', 
                        border: '1px solid #dadce0', 
                        borderRadius: '4px',
                        color: '#5f6368', 
                        cursor: 'pointer', 
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                    title="Sair"
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f1f3f4'; e.currentTarget.style.borderColor = '#d2e3fc'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#dadce0'; }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </>
        )}

        {/* STATE 2: Connected Badge */}
        {isUserLoggedIn && hasTokens && (
            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                background: '#f8f9fa', 
                padding: '6px 8px 6px 6px', 
                borderRadius: '30px', 
                border: '1px solid #e8eaed',
                boxShadow: '0 1px 2px rgba(60,64,67,0.05)'
            }}>
                {/* Avatar */}
                {userAvatar ? (
                    <img 
                        src={userAvatar} 
                        alt="Profile" 
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#1a73e8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                        {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                )}
                
                {/* Info */}
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', alignItems: 'flex-start', paddingRight: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#1a73e8', fontWeight: '700', letterSpacing: '0.3px', textTransform: 'uppercase' }}>Conectado</span>
                    <span style={{ fontSize: '12px', color: '#3c4043', fontWeight: '500', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {connectedGoogleEmail || userEmail || 'Conta Google'}
                    </span>
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '24px', background: '#dadce0', margin: '0 2px' }}></div>

                {/* Logout */}
                <button 
                    onClick={handleLogout} 
                    type="button"
                    style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#5f6368', 
                        cursor: 'pointer', 
                        padding: '6px',
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: '50%',
                        transition: 'background 0.2s'
                    }}
                    title="Desconectar"
                    onMouseOver={(e) => { e.currentTarget.style.background = '#e8eaed'; e.currentTarget.style.color = '#202124'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5f6368'; }}
                >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                </button>
            </div>
        )}
      </div>
    </div>
  );
}
