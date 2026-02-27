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

interface PointsEarnedProps {
  customerName: string
  merchantName: string
  merchantLogoUrl: string | null
  pointsEarned: number
  newBalance: number
  walletUrl: string
  unsubscribeUrl: string
}

export function PointsEarned({
  customerName,
  merchantName,
  merchantLogoUrl,
  pointsEarned,
  newBalance,
  walletUrl,
  unsubscribeUrl,
}: PointsEarnedProps) {
  return (
    <Html>
      <Head />
      <Preview>{`You earned ${pointsEarned} points at ${merchantName}`}</Preview>
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
            You just earned <strong>{pointsEarned} points</strong> at {merchantName}. Keep it up!
          </Text>
          <Section style={statsBox}>
            <Text style={statLabel}>New balance</Text>
            <Text style={statValue}>{newBalance.toLocaleString()} pts</Text>
          </Section>
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
const statsBox = { backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', textAlign: 'center' as const, margin: '16px 0' }
const statLabel = { fontSize: '12px', color: '#6b7280', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const statValue = { fontSize: '32px', fontWeight: '700', margin: '4px 0 0', color: '#111827' }
const button = { backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
const link = { color: '#9ca3af' }
