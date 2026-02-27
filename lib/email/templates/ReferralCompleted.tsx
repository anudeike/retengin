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

interface ReferralCompletedProps {
  recipientName: string
  merchantName: string
  merchantLogoUrl: string | null
  role: 'referrer' | 'referee'
  merchantPointsEarned: number
  taploPointsEarned: number
  walletUrl: string
  unsubscribeUrl: string
}

export function ReferralCompleted({
  recipientName,
  merchantName,
  merchantLogoUrl,
  role,
  merchantPointsEarned,
  taploPointsEarned,
  walletUrl,
  unsubscribeUrl,
}: ReferralCompletedProps) {
  const headline =
    role === 'referrer'
      ? `Your referral at ${merchantName} is complete!`
      : `Welcome bonus from ${merchantName}!`

  const body =
    role === 'referrer'
      ? `Someone you referred just made their first purchase at ${merchantName}. Here's your bonus:`
      : `You completed your first purchase at ${merchantName} via a referral. Here's your welcome bonus:`

  return (
    <Html>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          {merchantLogoUrl && (
            <Section style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Img src={merchantLogoUrl} width={64} height={64} alt={merchantName} style={logo} />
            </Section>
          )}
          <Heading style={h1}>{merchantName}</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>{body}</Text>
          <Section style={bonusBox}>
            {merchantPointsEarned > 0 && (
              <Text style={bonusRow}>
                +{merchantPointsEarned} <span style={bonusUnit}>{merchantName} points</span>
              </Text>
            )}
            {taploPointsEarned > 0 && (
              <Text style={bonusRow}>
                +{taploPointsEarned} <span style={bonusUnit}>Taplo points</span>
              </Text>
            )}
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
const bonusBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', textAlign: 'center' as const, margin: '16px 0' }
const bonusRow = { fontSize: '22px', fontWeight: '700', color: '#15803d', margin: '4px 0' }
const bonusUnit = { fontSize: '14px', fontWeight: '400', color: '#166534' }
const button = { backgroundColor: '#111827', color: '#ffffff', borderRadius: '6px', padding: '12px 24px', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }
const link = { color: '#9ca3af' }
