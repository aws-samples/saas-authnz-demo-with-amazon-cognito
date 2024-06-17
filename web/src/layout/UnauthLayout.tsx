// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Heading } from '@aws-amplify/ui-react'
import { ThemeProvider } from '@aws-amplify/ui-react';
import RequireUnauth from '../component/RequireUnauth'
import './UnauthLayout.css'

import { Theme } from '@aws-amplify/ui-react';

const theme: Theme = {
  name: 'my-custom-theme',
  tokens: {
    colors: {
      primary: {
        10: { value: '{colors.neutral.10.value}' },
        20: { value: '{colors.neutral.20.value}' },
        40: { value: '{colors.neutral.40.value}' },
        60: { value: '{colors.neutral.60.value}' },
        80: { value: '{colors.neutral.80.value}' },
        90: { value: '{colors.neutral.90.value}' },
        100: { value: '{colors.neutral.100.value}' },
      },
      secondary: {
        10: { value: '{colors.blue.10.value}' },
        20: { value: '{colors.blue.20.value}' },
        40: { value: '{colors.blue.40.value}' },
        60: { value: '{colors.blue.60.value}' },
        80: { value: '{colors.blue.80.value}' },
        90: { value: '{colors.blue.90.value}' },
        100: { value: '{colors.blue.100.value}' },
      },
      border: {
        primary: { value: '{colors.neutral.40.value}' },
        secondary: { value: '{colors.neutral.20.value}' },
        tertiary: { value: '{colors.neutral.10.value}' },
      },
    },
    borderWidths: {
      small: { value: '1px' },
      medium: { value: '1px' },
      large: { value: '2px' },
    },
    radii: {
      xs: { value: '1rem' },
      small: { value: '2rem' },
      medium: { value: '2rem' },
      large: { value: '2rem' },
      xl: { value: '3rem' },
    },
    space: {
      xs: { value: '0.75rem' },
      small: { value: '1rem' },
      medium: { value: '1.5rem' },
      large: { value: '2rem' },
      xl: { value: '2rem' },
    },
  }
}

export default function UnauthLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireUnauth>
      <ThemeProvider theme={theme}>
        <div className="UnauthLayout">
          <Heading level={2} className="center">
            Demo App
          </Heading>
          { children }
        </div>
      </ThemeProvider>
    </RequireUnauth>
  )
}