import { useCallback, useState, useEffect, useRef } from "react"
import type { ConfigAppSDK } from "@contentful/app-sdk"
import { Heading, Form, Paragraph, Flex, FormControl, TextInput } from "@contentful/f36-components"
import { css } from "emotion"
import { useSDK } from "@contentful/react-apps-toolkit"

export interface AppInstallationParameters {
  accessToken: string
}

const ConfigScreen = () => {
  const [parameters, setParameters] = useState<AppInstallationParameters>({
    accessToken: "",
  })
  const [isLoading, setIsLoading] = useState(true)

  const sdk = useSDK<ConfigAppSDK>()
  const parametersRef = useRef(parameters)

  // Keep ref updated with current parameters
  useEffect(() => {
    parametersRef.current = parameters
  }, [parameters])

  const onConfigure = useCallback(async () => {
    try {
      // Validate parameters
      const currentParams = parametersRef.current

      if (!currentParams.accessToken || currentParams.accessToken.trim() === "") {
        sdk.notifier.error("Please provide an OpenAI API Key")
        return false
      }

      // Get current state
      const currentState = await sdk.app.getCurrentState()

      return {
        parameters: currentParams,
        targetState: {
          EditorInterface: currentState?.EditorInterface || {},
        },
      }
    } catch (error) {
      console.error("Configuration error:", error)
      sdk.notifier.error("Failed to save configuration")
      return false
    }
  }, [sdk])

  // Register the configure callback only once
  useEffect(() => {
    sdk.app.onConfigure(onConfigure)
  }, [sdk, onConfigure])

  // Load existing parameters
  useEffect(() => {
    const loadParameters = async () => {
      try {
        setIsLoading(true)
        const currentParameters: AppInstallationParameters | null = await sdk.app.getParameters()

        if (currentParameters) {
          console.log("Loaded parameters:", currentParameters)
          setParameters(currentParameters)
        } else {
          console.log("No existing parameters found")
          setParameters({ accessToken: "" })
        }
      } catch (error) {
        console.error("Error loading parameters:", error)
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

        <FormControl marginBottom="spacingL">
          <FormControl.Label>OpenAI API Key</FormControl.Label>
          <TextInput
            value={parameters.accessToken}
            type="password"
            name="accessToken"
            placeholder="Enter your OpenAI API key"
            onChange={(e) => setParameters((prev) => ({ ...prev, accessToken: e.target.value }))}
          />
          <FormControl.HelpText>This key will be used to generate alt text for images</FormControl.HelpText>
        </FormControl>
      </Form>
    </Flex>
  )
}

export default ConfigScreen
