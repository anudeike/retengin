import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createServiceRoleClient } from '@/lib/supabase/server'

function formatRewardText(
  type: string,
  merchantPoints: number,
  taploPoints: number,
  title: string | null,
  value: number | null,
): string {
  switch (type) {
    case 'points':
      return `${merchantPoints} points${taploPoints > 0 ? ` + ${taploPoints} Taplo points` : ''}`
    case 'item':
      return title ?? 'Item reward'
    case 'discount_percent':
      return `${value ?? 0}% off${title ? ` — ${title}` : ''}`
    case 'discount_flat':
      return `$${(value ?? 0).toFixed(2)} off${title ? ` — ${title}` : ''}`
    default:
      return '—'
  }
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ReferralProgramPage({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceRoleClient()

  // Fetch merchant (must be active)
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, logo_url, slug, status')
    .eq('slug', slug)
    .maybeSingle()

  if (!merchant || merchant.status !== 'active') {
    notFound()
  }

  // Fetch program (must be enabled)
  const { data: program } = await supabase
    .from('referral_programs')
    .select(
      'id, name, description, is_enabled, purchase_count_required, ends_at',
    )
    .eq('merchant_id', merchant.id)
    .maybeSingle()

  if (!program?.is_enabled) {
    notFound()
  }

  // Fetch tiers
  const { data: tiers } = await supabase
    .from('referral_spend_tiers')
    .select('*')
    .eq('referral_program_id', program.id)
    .order('min_spend_cents', { ascending: true })

  const programName = program.name ?? 'Referral Program'
  const joinUrl = `/join/${slug}`
  const purchaseCount = program.purchase_count_required ?? 1

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Merchant branding */}
        <div className="text-center mb-8">
          {merchant.logo_url ? (
            <Image
              src={merchant.logo_url}
              alt={merchant.business_name}
              width={80}
              height={80}
              className="mx-auto rounded-xl object-contain mb-3"
            />
          ) : (
            <div className="w-20 h-20 bg-gray-900 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-2xl font-bold">
                {merchant.business_name.charAt(0)}
              </span>
            </div>
          )}
          <p className="text-sm text-gray-500 font-medium">{merchant.business_name}</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{programName}</h1>
          {program.description && (
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">{program.description}</p>
          )}
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-900 mb-3">How it works</h2>
          <ol className="space-y-3">
            <li className="flex gap-3 text-sm text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">
                1
              </span>
              Share your unique referral link with a friend
            </li>
            <li className="flex gap-3 text-sm text-gray-700">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">
                2
              </span>
              Your friend signs up and visits {merchant.business_name}
            </li>
            {purchaseCount > 1 ? (
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">
                  3
                </span>
                After {purchaseCount} qualifying purchases, both of you earn rewards
              </li>
            ) : (
              <li className="flex gap-3 text-sm text-gray-700">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center font-semibold">
                  3
                </span>
                After their first qualifying purchase, both of you earn rewards
              </li>
            )}
          </ol>
        </div>

        {/* Reward tiers */}
        {(tiers ?? []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
            <h2 className="font-semibold text-gray-900 mb-3">Reward tiers</h2>
            <div className="space-y-3">
              {(tiers ?? []).map((tier) => (
                <div key={tier.id} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    When referee spends ${(tier.min_spend_cents / 100).toFixed(2)}+
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500 mb-0.5">You get (referrer)</p>
                      <p className="font-medium text-gray-900">
                        {formatRewardText(
                          tier.referrer_reward_type,
                          tier.referrer_merchant_points,
                          tier.referrer_taplo_points,
                          tier.referrer_reward_title,
                          tier.referrer_reward_value,
                        )}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-2">
                      <p className="text-xs text-gray-500 mb-0.5">Your friend gets</p>
                      <p className="font-medium text-gray-900">
                        {formatRewardText(
                          tier.referee_reward_type,
                          tier.referee_merchant_points,
                          tier.referee_taplo_points,
                          tier.referee_reward_title,
                          tier.referee_reward_value,
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expiry notice */}
        {program.ends_at && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 text-sm text-amber-800">
            This program expires on{' '}
            <strong>
              {new Date(program.ends_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </strong>
            .
          </div>
        )}

        {/* CTA */}
        <Link
          href={joinUrl}
          className="block w-full text-center bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-700 transition-colors"
        >
          Sign up to get your referral link
        </Link>
        <p className="text-center text-xs text-gray-500 mt-3">
          Already have an account?{' '}
          <Link href={joinUrl} className="underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
