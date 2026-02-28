'use client'

import { useState } from 'react'

type RewardType = 'points' | 'item' | 'discount_percent' | 'discount_flat'

const REWARD_LABELS: Record<RewardType, string> = {
  points: 'Points',
  item: 'Free item',
  discount_percent: '% Discount',
  discount_flat: '$ Discount',
}

interface RewardFieldsProps {
  prefix: 'referrer' | 'referee'
  type: RewardType
}

function RewardFields({ prefix, type }: RewardFieldsProps) {
  switch (type) {
    case 'points':
      return (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${prefix}_merchant_points`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Merchant points
              </label>
              <input
                id={`${prefix}_merchant_points`}
                name={`${prefix}_merchant_points`}
                type="number"
                min="0"
                defaultValue={0}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label
                htmlFor={`${prefix}_taplo_points`}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Taplo points
              </label>
              <input
                id={`${prefix}_taplo_points`}
                name={`${prefix}_taplo_points`}
                type="number"
                min="0"
                defaultValue={0}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>
        </>
      )

    case 'item':
      return (
        <div>
          <label
            htmlFor={`${prefix}_reward_title`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Item name (e.g. &ldquo;Free Coffee&rdquo;)
          </label>
          <input
            id={`${prefix}_reward_title`}
            name={`${prefix}_reward_title`}
            type="text"
            placeholder="Free Coffee"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
      )

    case 'discount_percent':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`${prefix}_reward_value`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Discount (%)
            </label>
            <input
              id={`${prefix}_reward_value`}
              name={`${prefix}_reward_value`}
              type="number"
              min="1"
              max="100"
              step="1"
              placeholder="10"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label
              htmlFor={`${prefix}_reward_title`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Label (optional)
            </label>
            <input
              id={`${prefix}_reward_title`}
              name={`${prefix}_reward_title`}
              type="text"
              placeholder="Off your next visit"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      )

    case 'discount_flat':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor={`${prefix}_reward_value`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount ($)
            </label>
            <input
              id={`${prefix}_reward_value`}
              name={`${prefix}_reward_value`}
              type="number"
              min="0.01"
              step="0.01"
              placeholder="5.00"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <div>
            <label
              htmlFor={`${prefix}_reward_title`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Label (optional)
            </label>
            <input
              id={`${prefix}_reward_title`}
              name={`${prefix}_reward_title`}
              type="text"
              placeholder="Off your next purchase"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
        </div>
      )
  }
}

interface ReferralTierFormProps {
  action: (formData: FormData) => void | Promise<void>
}

export default function ReferralTierForm({ action }: ReferralTierFormProps) {
  const [referrerType, setReferrerType] = useState<RewardType>('points')
  const [refereeType, setRefereeType] = useState<RewardType>('points')

  return (
    <form action={action} className="space-y-6">
      {/* Min spend */}
      <div>
        <label htmlFor="min_spend_dollars" className="block text-sm font-medium text-gray-700 mb-1">
          Minimum spend to qualify ($)
        </label>
        <input
          id="min_spend_dollars"
          name="min_spend_dollars"
          type="number"
          min="0"
          step="0.01"
          defaultValue={0}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Referrer reward */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-900 px-1">Referrer Gets</legend>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="referrer_reward_type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reward type
            </label>
            <select
              id="referrer_reward_type"
              name="referrer_reward_type"
              value={referrerType}
              onChange={(e) => setReferrerType(e.target.value as RewardType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {(Object.keys(REWARD_LABELS) as RewardType[]).map((t) => (
                <option key={t} value={t}>
                  {REWARD_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <RewardFields prefix="referrer" type={referrerType} />
        </div>
      </fieldset>

      {/* Referee reward */}
      <fieldset className="border border-gray-200 rounded-lg p-4">
        <legend className="text-sm font-semibold text-gray-900 px-1">Referee Gets</legend>
        <div className="space-y-3">
          <div>
            <label
              htmlFor="referee_reward_type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Reward type
            </label>
            <select
              id="referee_reward_type"
              name="referee_reward_type"
              value={refereeType}
              onChange={(e) => setRefereeType(e.target.value as RewardType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              {(Object.keys(REWARD_LABELS) as RewardType[]).map((t) => (
                <option key={t} value={t}>
                  {REWARD_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <RewardFields prefix="referee" type={refereeType} />
        </div>
      </fieldset>

      <button
        type="submit"
        className="w-full rounded-md bg-gray-900 text-white text-sm font-semibold py-2 px-4 hover:bg-gray-700 transition-colors"
      >
        Add tier
      </button>
    </form>
  )
}
