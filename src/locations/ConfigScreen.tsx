"use client"

import { useCallback, useState, useEffect } from "react"
import type { ConfigAppSDK } from "@contentful/app-sdk"
import { Heading, Form, Paragraph, Flex, FormControl, TextInput, Note } from "@contentful/f36-components"
import { css } from "emotion"
import { useSDK } from "@contentful/react-apps-toolkit"

export interface AppInstallationParameters {
  accessToken?: string
}

const ConfigScreen = () => {
  const [parameters, setParameters] = useState<AppInstallationParameters>({
    accessToken: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const sdk = useSDK<ConfigAppSDK>()

  const onConfigure = useCallback(async () => {
    try {
      console.log("onConfigure called with parameters:", parameters)

      // Clear any previous errors
      setError(null)

      // Validate required fields
      if (!parameters.accessToken || parameters.accessToken.trim() === "") {
        const errorMsg = "OpenAI API Key is required"
        setError(errorMsg)
        sdk.notifier.error(errorMsg)
        return false
      }

      // Prepare the configuration object
      const config = {
        parameters: {
          accessToken: parameters.accessToken.trim(),
        },
      }

      console.log("Saving configuration:", config)
      return config
    } catch (error) {
      console.error("Configuration error:", error)
      const errorMsg = `Failed to save configuration: ${error instanceof Error ? error.message : "Unknown error"}`
      setError(errorMsg)
      sdk.notifier.error(errorMsg)
      return false
    }
  }, [parameters, sdk])

  // Register the configure callback
  useEffect(() => {
    console.log("Registering onConfigure callback")
    sdk.app.onConfigure(onConfigure)
  }, [sdk, onConfigure])

  // Load existing parameters
  useEffect(() => {
    const loadParameters = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log("Loading parameters...")
        const currentParameters = await sdk.app.getParameters()

        console.log("Raw parameters from Contentful:", currentParameters)

        if (currentParameters && typeof currentParameters === "object") {
          // Handle case where parameters might be nested or have different structure
          const accessToken = currentParameters.accessToken || currentParameters.parameters?.accessToken || ""

          console.log("Extracted accessToken:", accessToken ? "[REDACTED]" : "empty")

          setParameters({ accessToken })
        } else {
          console.log("No existing parameters found, using defaults")
          setParameters({ accessToken: "" })
        }
      } catch (error) {
        console.error("Error loading parameters:", error)
        setError(`Failed to load configuration: ${error instanceof Error ? error.message : "Unknown error"}`)
        setParameters({ accessToken: "" })
      } finally {
        setIsLoading(false)
        sdk.app.setReady()
      }
    }

    loadParameters()
  }, [sdk])

  if (isLoading) {
    return (
      <Flex flexDirection="column" className={css({ margin: "80px", maxWidth: "800px" })}>
        <Paragraph>Loading configuration...</Paragraph>
      </Flex>
    )
  }

  return (
    <Flex flexDirection="column" className={css({ margin: "80px", maxWidth: "800px" })}>
      <Form>
        <Heading>Alt Text A11y App Config</Heading>
        <Paragraph>🎉 Thank you for making the web more accessible! 🎉</Paragraph>

        {error && (
          <Note variant="negative" style={{ marginBottom: "1rem" }}>
            {error}
          </Note>
        )}

        <FormControl marginBottom="spacingL">
          <FormControl.Label isRequired>OpenAI API Key</FormControl.Label>
          <TextInput
            value={parameters.accessToken || ""}
            type="password"
            name="accessToken"
            placeholder="sk-..."
            onChange={(e) => {
              setError(null) // Clear error when user starts typing
              setParameters((prev) => ({ ...prev, accessToken: e.target.value }))
            }}
          />
          <FormControl.HelpText>
            This key will be used to generate alt text for images. Get your API key from OpenAI.
          </FormControl.HelpText>
        </FormControl>

        <Note variant="primary">
          <strong>Debug Info:</strong>
          <br />
          Space ID: {sdk.ids.space}
          <br />
          Environment: {sdk.ids.environment}
          <br />
          App ID: {sdk.ids.app}
          <br />
          Has Access Token: {parameters.accessToken ? "Yes" : "No"}
        </Note>
      </Form>
    </Flex>
  )
}

export default ConfigScreen
