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

interface RewardRedeemedProps {
  customerName: string
  merchantName: string
  merchantLogoUrl: string | null
  rewardName: string
  pointsSpent: number
  remainingBalance: number
  walletUrl: string
  unsubscribeUrl: string
}

export function RewardRedeemed({
  customerName,
  merchantName,
  merchantLogoUrl,
  rewardName,
  pointsSpent,
  remainingBalance,
  walletUrl,
  unsubscribeUrl,
}: RewardRedeemedProps) {
  return (
    <Html>
      <Head />
      <Preview>Your reward at {merchantName} has been redeemed</Preview>
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
            Your reward has been successfully redeemed at {merchantName}. Enjoy!
          </Text>
          <Section style={rewardBox}>
            <Text style={rewardLabel}>Redeemed</Text>
            <Text style={rewardName_}>{rewardName}</Text>
            <Text style={costText}>&minus;{pointsSpent} pts</Text>
          </Section>
          <Section style={balanceRow}>
            <Text style={balanceLabel}>Remaining balance</Text>
            <Text style={balanceValue}>{remainingBalance.toLocaleString()} pts</Text>
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
const rewardBox = { backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '16px', textAlign: 'center' as const, margin: '16px 0' }
const rewardLabel = { fontSize: '12px', color: '#6b7280', margin: '0', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }
const rewardName_ = { fontSize: '20px', fontWeight: '700', margin: '4px 0 2px', color: '#111827' }
const costText = { fontSize: '14px', color: '#ef4444', margin: '0' }
const balanceRow = { textAlign: 'center' as const, margin: '8px 0 16px' }
const balanceLabel = { fontSize: '12px', color: '#6b7280', margin: '0' }
const balanceValue = { fontSize: '18px', fontWeight: '600', color: '#111827', margin: '2px 0 0' }
const button = { backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
const link = { color: '#9ca3af' }
