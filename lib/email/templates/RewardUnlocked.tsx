import * as React from 'react'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface RewardUnlockedProps {
  customerName: string
  merchantName: string
  merchantLogoUrl: string | null
  rewardName: string
  walletUrl: string
  unsubscribeUrl: string
}

export function RewardUnlocked({
  customerName,
  merchantName,
  merchantLogoUrl,
  rewardName,
  walletUrl,
  unsubscribeUrl,
}: RewardUnlockedProps) {
  return (
    <Html>
      <Head />
      <Preview>Reward unlocked at {merchantName}: {rewardName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {merchantLogoUrl && (
            <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Img src={merchantLogoUrl} width={64} height={64} alt={merchantName} style={logo} />
            </Section>
          )}
          <Heading style={h1}>{merchantName}</Heading>
          <Text style={text}>Hi {customerName},</Text>
          <Text style={text}>
            Great news — you&apos;ve unlocked a reward at {merchantName}!
          </Text>
          <Section style={rewardBox}>
            <Text style={rewardLabel}>Unlocked reward</Text>
            <Text style={rewardName_}>{rewardName}</Text>
          </Section>
          <Text style={text}>
            Show your wallet to a staff member to redeem it on your next visit.
          </Text>
          <Section style={{ textAlign: 'center', margin: '24px 0' }}>
            <Button href={walletUrl} style={button}>View Wallet</Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Powered by Taplo &middot;{' '}
            <a href={unsubscribeUrl} style={link}>Unsubscribe from {merchantName} emails</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#f6f9fc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { backgroundColor: '#ffffff', margin: '40px auto', padding: '32px', borderRadius: '8px', maxWidth: '480px' }
const logo = { borderRadius: '50%', objectFit: 'cover' as const }
const h1 = { fontSize: '20px', fontWeight: '700', margin: '0 0 16px', textAlign: 'center' as const }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.6' }
const rewardBox = { backgroundColor: '#fef3c7', borderRadius: '8px', padding: '16px', textAlign: 'center' as const, margin: '16px 0' }
const rewardLabel = { fontSize: '12px', color: '#92400e', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const rewardName_ = { fontSize: '22px', fontWeight: '700', margin: '4px 0 0', color: '#92400e' }
const button = { backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
const link = { color: '#9ca3af' }
