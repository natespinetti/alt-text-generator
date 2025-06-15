import React, { useCallback, useState, useEffect } from 'react';
import { ConfigAppSDK } from '@contentful/app-sdk';
import { Heading, Form, Paragraph, Flex, FormControl, TextInput } from '@contentful/f36-components';
import { css } from 'emotion';
import { useSDK } from '@contentful/react-apps-toolkit';

export interface AppInstallationParameters {
  accessToken: string;
  cmaToken: string;
}

const ConfigScreen = () => {
  const [parameters, setParameters] = useState<AppInstallationParameters>({
    accessToken: '',
    cmaToken: '',
  });

  const sdk = useSDK<ConfigAppSDK>();

  const onConfigure = useCallback(async () => {
    const currentState = await sdk.app.getCurrentState();

    return {
      parameters,
      targetState: currentState,
    };
  }, [parameters, sdk]);

  useEffect(() => {
    sdk.app.onConfigure(() => onConfigure());
  }, [sdk, onConfigure]);

  useEffect(() => {
    (async () => {
      const currentParameters: AppInstallationParameters | null = await sdk.app.getParameters();
      if (currentParameters) {
          console.log(currentParameters);

        setParameters(currentParameters);
      } else {
        // Not installed yet — no problem
        setParameters({ accessToken: '', cmaToken: '' });
      }
      sdk.app.setReady();
    })();
  }, [sdk]);

  return (
    <Flex flexDirection="column" className={css({ margin: '80px', maxWidth: '800px' })}>
      <Form>
        <Heading>Alt Text A11y App Config</Heading>
        <Paragraph>🎉 Thank you for making the web more accessible! 🎉</Paragraph>

        <FormControl marginBottom="spacingL">
          <FormControl.Label>Access Token</FormControl.Label>
          <TextInput
            value={parameters.accessToken}
            type="text"
            name="accessToken"
            onChange={(e) => setParameters((prev) => ({ ...prev, accessToken: e.target.value }))}
          />
        </FormControl>

        <FormControl>
          <FormControl.Label>Contentful CMA Token</FormControl.Label>
          <TextInput
            value={parameters.cmaToken}
            type="text"
            name="cmaToken"
            onChange={(e) => setParameters((prev) => ({ ...prev, cmaToken: e.target.value }))}
          />
        </FormControl>
      </Form>
    </Flex>
  );
};

export default ConfigScreen;
