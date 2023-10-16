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
      brand: {
        primary: {
          10: { value: '{colors.neutral.10}' },
          20: { value: '{colors.neutral.20}' },
          40: { value: '{colors.neutral.40}' },
          60: { value: '{colors.neutral.60}' },
          80: { value: '{colors.neutral.80}' },
          90: { value: '{colors.neutral.90}' },
          100: { value: '{colors.neutral.100}' },
        },
        secondary: {
          10: { value: '{colors.blue.10}' },
          20: { value: '{colors.blue.20}' },
          40: { value: '{colors.blue.40}' },
          60: { value: '{colors.blue.60}' },
          80: { value: '{colors.blue.80}' },
          90: { value: '{colors.blue.90}' },
          100: { value: '{colors.blue.100}' },
        },
      },
      border: {
        primary: { value: '{colors.neutral.40}' },
        secondary: { value: '{colors.neutral.20}' },
        tertiary: { value: '{colors.neutral.10}' },
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