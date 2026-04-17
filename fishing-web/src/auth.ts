import { PublicClientApplication, type AccountInfo } from '@azure/msal-browser'

// SPA App Registration client ID
const SPA_CLIENT_ID = 'c1b9b628-6b2c-4a98-ae18-d06946eccdd1' // TODO: fill in SPA client ID

// API App Registration client ID
const API_CLIENT_ID = '97839f54-7f20-462e-a8bc-49e5d1cc4dc3' // TODO: fill in API client ID

const msalConfig = {
  auth: {
    clientId: SPA_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/f064a424-f947-4da9-9538-c68c2ec3e3f6', // TODO: replace 'common' with your tenant ID
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'localStorage' as const,
  }
}

const loginRequest = {
  scopes: ['User.Read']
}

const tokenRequest = {
  scopes: [`api://${API_CLIENT_ID}/access_as_user`]
}

const msalInstance = new PublicClientApplication(msalConfig)

let initialized = false

async function ensureInitialized() {
  if (initialized) return
  await msalInstance.initialize()
  await msalInstance.handleRedirectPromise()
  initialized = true
}

export async function login(): Promise<void> {
  await ensureInitialized()
  await msalInstance.loginRedirect(loginRequest)
}

export async function logout(): Promise<void> {
  await ensureInitialized()
  await msalInstance.logoutRedirect()
}

export async function getAccount(): Promise<AccountInfo | null> {
  await ensureInitialized()
  const accounts = msalInstance.getAllAccounts()
  return accounts.length > 0 ? accounts[0] : null
}

export async function getAccessToken(): Promise<string | null> {
  await ensureInitialized()
  const account = await getAccount()
  if (!account) return null
  try {
    const result = await msalInstance.acquireTokenSilent({ ...tokenRequest, account })
    return result.accessToken
  } catch {
    try {
      const result = await msalInstance.acquireTokenPopup(tokenRequest)
      return result.accessToken
    } catch {
      return null
    }
  }
}

export function isLoggedIn(): boolean {
  return msalInstance.getAllAccounts().length > 0
}
