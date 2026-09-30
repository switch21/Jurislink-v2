# 🔍 Analyse complète — React Error #185 (Maximum update depth exceeded)

## Diagnostic

L'erreur React **#185** signifie **"Maximum update depth exceeded"** — une boucle infinie de re-rendus React. Après analyse approfondie du code source (version `6bf7605` sur `origin/main`), j'ai identifié **5 problèmes** dont **3 critiques** qui se combinent pour créer cette boucle.

> [!CAUTION]
> Un autre agent a déjà tenté des corrections (commits `3be2b95`, `0491842`, `6bf7605`) mais les problèmes architecturaux fondamentaux persistent. Ces commits ont ajouté un système `hydrateFromStorage` et déplacé `initAuthFetch` dans un `useEffect`, mais n'ont pas corrigé les causes racines de la boucle infinie.

---

## 🔴 Bug Critique #1 — Double instance de `usePollingNotifications` créant une boucle infinie

**C'est la cause principale de l'erreur #185.**

### Le problème

Deux composants actifs simultanément appellent le même hook de polling :

- [`Header.tsx`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/Header.tsx#L72) (ligne 72):
  ```tsx
  const { notifications, unreadCount, refetchNow } = usePollingNotifications(!!user?.tenantId)
  ```

- [`DashboardView.tsx`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/DashboardView.tsx#L25) (ligne 25):
  ```tsx
  const { notifications: recentNotifs, unreadCount: notifUnread, refetchNow: refetchNotifs } = usePollingNotifications(!!user?.tenantId)
  ```

Dans [`use-polling-notifications.ts`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/hooks/use-polling-notifications.ts#L40-L51) (lignes 40-51), chaque instance exécute un `useEffect` qui met à jour le store Zustand :

```tsx
useEffect(() => {
  // ...
  if (unreadCount !== prevCountRef.current) {
    useAppStore.getState().setUnreadCount(unreadCount) // ← MET À JOUR LE STORE GLOBAL
  }
  prevCountRef.current = unreadCount
}, [unreadCount])
```

### La boucle infinie

```
Instance A (Header) met à jour setUnreadCount(N)
  → Le store Zustand change
  → AppInner, Header, DashboardView re-rendent (pas de sélecteurs Zustand)
  → Instance B (DashboardView) reçoit un nouveau unreadCount
  → Instance B appelle setUnreadCount(N)
  → Le store Zustand re-notifie
  → Boucle infinie → React Error #185
```

### Correction proposée

**Remonter le polling au niveau de `AppInner`** dans `AppClient.tsx` et passer les données aux composants enfants via le contexte React ou des props, OU supprimer l'appel dans `DashboardView` et ne garder que celui du `Header`.

---

## 🔴 Bug Critique #2 — Subscriptions Zustand sans sélecteurs (re-rendus en cascade)

### Le problème

Tous les composants du chemin de rendu utilisent `useAppStore()` **sans sélecteur**, ce qui signifie que CHAQUE changement dans le store (même `unreadCount` qui change toutes les 30s) déclenche le re-rendu de TOUS ces composants simultanément :

| Composant | Ligne | Appel |
|---|---|---|
| [`AppInner`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/AppClient.tsx#L171) | 171 | `const { isAuthenticated, isPortalAuthenticated, user } = useAppStore()` |
| [`Header`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/Header.tsx#L63) | 63 | `const { currentView, user, logout, setCurrentView, ... } = useAppStore()` |
| [`Sidebar`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/Sidebar.tsx#L10) | 10 | `const { currentView, setCurrentView, user, sidebarOpen, ... } = useAppStore()` |
| [`DashboardView`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/DashboardView.tsx#L11) | 11 | `const { user, setCurrentView } = useAppStore()` |
| [`AdminRouter`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/AppClient.tsx#L98) | 98 | `const { currentView } = useAppStore()` |
| [`DashboardRouter`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/AppClient.tsx#L125) | 125 | `const { currentView } = useAppStore()` |

### Correction proposée

Utiliser des **sélecteurs granulaires** pour que chaque composant ne re-rende que lorsque les propriétés qu'il utilise changent :

```tsx
// ❌ AVANT — re-rend à CHAQUE changement du store
const { isAuthenticated, user } = useAppStore()

// ✅ APRÈS — ne re-rend que si isAuthenticated ou user change
const isAuthenticated = useAppStore(s => s.isAuthenticated)
const user = useAppStore(s => s.user)
```

---

## 🔴 Bug Critique #3 — `global-error.tsx` rend une page vide pour TOUTES les erreurs

### Le problème

Le [`global-error.tsx`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/global-error.tsx) actuel (version `origin/main`) rend `<div />` (un div vide) pour **TOUTES les erreurs**, pas seulement les erreurs d'hydratation :

```tsx
// global-error.tsx — version actuelle sur origin/main
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  // Silently handle hydration errors...
  return (
    <html lang="fr">
      <body style={{ margin: 0, padding: 0 }}>
        <div />  // ← ÉCRAN BLANC POUR TOUTE ERREUR !
      </body>
    </html>
  )
}
```

Cela signifie que si l'erreur #185 (ou toute autre erreur) remonte jusqu'au `global-error.tsx`, l'utilisateur voit un **écran blanc** sans aucune information.

### Correction proposée

Afficher un vrai UI d'erreur avec message et bouton "Réessayer", tout en loguant l'erreur dans la console.

---

## 🟡 Bug Secondaire #4 — `useToast` a `state` dans son tableau de dépendances

### Le problème

Dans [`use-toast.ts`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/hooks/use-toast.ts#L194-L202) (lignes 194-202) :

```tsx
React.useEffect(() => {
  listeners.push(setState)
  return () => {
    const index = listeners.indexOf(setState)
    if (index > -1) { listeners.splice(index, 1) }
  }
}, [state])  // ← state dans les deps !
```

Chaque changement de `state` → l'effect se re-exécute → ajoute un NOUVEAU `setState` au tableau de listeners → fuite mémoire + risque de cascades d'updates.

### Correction proposée

Remplacer `[state]` par `[]` (tableau vide) — l'effet ne doit s'exécuter qu'au montage/démontage.

---

## 🟡 Bug Secondaire #5 — `hydrateFromStorage` ignore la vue sauvegardée pour les utilisateurs authentifiés

### Le problème

Dans [`appStore.ts`](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/store/appStore.ts#L292-L300) (lignes 292-300) :

```tsx
hydrateFromStorage: () => {
  const user = loadUser()
  if (user) {
    set({
      user,
      isAuthenticated: true,
      currentView: user.role === 'root_admin' ? 'admin-dashboard' : 'dashboard'
      // ← IGNORE la vue sauvegardée dans localStorage !
    })
  }
}
```

La vue sauvegardée (`jurislink_current_view`) n'est jamais restaurée pour un utilisateur authentifié. À chaque rechargement, l'utilisateur est renvoyé au `dashboard` même s'il était sur `invoices` ou `calendar`.

### Correction proposée

Utiliser `loadSavedView()` au lieu de forcer `'dashboard'` :

```tsx
const savedView = loadSavedView()
set({
  user,
  isAuthenticated: true,
  currentView: savedView !== 'login' ? savedView : (user.role === 'root_admin' ? 'admin-dashboard' : 'dashboard')
})
```

---

## Proposed Changes

### Composant: Hooks et Polling

#### [MODIFY] [use-polling-notifications.ts](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/hooks/use-polling-notifications.ts)
- Supprimer l'appel à `useAppStore.getState().setUnreadCount(unreadCount)` depuis le hook
- Le hook ne doit retourner que les données, sans modifier le store global

#### [MODIFY] [use-toast.ts](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/hooks/use-toast.ts)
- Changer `}, [state])` → `}, [])` dans le `useEffect` de `useToast()`

---

### Composant: Orchestrateur Principal

#### [MODIFY] [AppClient.tsx](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/AppClient.tsx)
- `AppInner` : utiliser des sélecteurs Zustand granulaires au lieu de `useAppStore()`
- Remonter `usePollingNotifications` au niveau de `AppInner` et le passer en contexte

#### [MODIFY] [Header.tsx](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/Header.tsx)
- Utiliser des sélecteurs Zustand granulaires
- Recevoir les données de notifications depuis les props ou un contexte partagé

#### [MODIFY] [Sidebar.tsx](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/Sidebar.tsx)
- Utiliser des sélecteurs Zustand granulaires

#### [MODIFY] [DashboardView.tsx](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/views/DashboardView.tsx)
- Supprimer l'appel dupliqué à `usePollingNotifications`
- Utiliser les données partagées depuis le contexte ou les props
- Utiliser des sélecteurs Zustand granulaires

---

### Composant: Error Boundaries

#### [MODIFY] [global-error.tsx](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/app/global-error.tsx)
- Afficher un vrai UI d'erreur au lieu d'un `<div />` vide
- Logger l'erreur dans la console

---

### Composant: Store Zustand

#### [MODIFY] [appStore.ts](file:///C:/Users/patep/Documents/GitHub/Jurislink-v2/src/store/appStore.ts)
- Corriger `hydrateFromStorage` pour restaurer la vue sauvegardée

---

## Verification Plan

### Automated Tests
- `npm run build` — vérifier que le build passe sans erreur
- Tester la connexion avec `pat.epee@gmail.com` (root_admin) → doit voir le tableau de bord admin
- Tester la connexion avec un compte tenant (ex: `ngassa@jurislink.com` / `Admin@123`) → doit voir le dashboard normal SANS écran blanc
- Ouvrir la console navigateur (F12) → aucune erreur `#185` ne doit apparaître

### Manual Verification
- Après push → Vercel auto-deploy → tester sur https://www.jurislink.pro/
- Vérifier que les notifications se mettent à jour correctement (une seule source)
- Vérifier que le changement de vue persiste après rechargement

---

## Open Questions

> [!IMPORTANT]
> **Commits récents d'un autre agent** : Les commits `3be2b95`, `0491842`, `6bf7605` (par un autre agent) ont modifié 251 fichiers. Certaines de ces modifications (comme les fichiers dupliqués dans `src/components/views/`, `src/components/layout/`, scripts Python, etc.) semblent être du code de débogage ou des duplications non nécessaires. Souhaitez-vous que je nettoie ces fichiers en même temps, ou préférez-vous ne corriger que le bug #185 ?

> [!IMPORTANT]
> **Approche de correction** : Je propose de corriger les 5 bugs identifiés. Voulez-vous que je procède à toutes les corrections en même temps, ou préférez-vous une approche incrémentale (un commit par bug) ?

> [!NOTE]
> **Le compte `pat.epee@gmail.com` reste `root_admin`** — aucune modification de rôle ou de données en base ne sera effectuée. Les corrections sont uniquement côté code client.
