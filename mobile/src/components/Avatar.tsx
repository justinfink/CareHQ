import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { colors, typography, borderRadius } from '../theme'

interface AvatarProps {
  name: string
  size?: number
  color?: string
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  // Skip prefixes like "Dr." or suffixes like "PT"
  const first = parts[0].replace(/^(Dr\.?|Mr\.?|Mrs\.?|Ms\.?)$/i, '') || parts[0]
  const last = parts[parts.length - 1].replace(/^(PT|MD|RN|DO|PhD)$/i, '') || parts[parts.length - 1]
  return (first[0] + last[0]).toUpperCase()
}

function getColorForName(name: string): string {
  const avatarColors = [
    '#0A7B6E', '#2563EB', '#8B5CF6', '#DC2626',
    '#F0A830', '#16A34A', '#EC4899', '#6366F1',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

export default function Avatar({ name, size = 40, color }: AvatarProps) {
  const initials = getInitials(name)
  const bgColor = color || getColorForName(name)
  const fontSize = size * 0.38

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {initials}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textOnPrimary,
    fontFamily: typography.fontFamily.semiBold,
  },
})
