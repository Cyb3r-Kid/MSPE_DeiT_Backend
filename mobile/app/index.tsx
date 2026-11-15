import { useEffect } from 'react';
import { router } from 'expo-router';
import { Page, Loading } from '../components/UI';
import { useSession } from '../store/session';
export default function Splash() { const { ready, access } = useSession(); useEffect(() => { if (ready) router.replace(access ? '/home' : '/onboarding'); }, [ready, access]); return <Page title="MSPE-DeiT" subtitle="AI assisted lesion research"><Loading /></Page>; }
