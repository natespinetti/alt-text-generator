import React, { useState, useEffect } from 'react';
import {
  Button,
  Textarea,
  ButtonGroup,
  Stack
} from '@contentful/f36-components';
import { CycleIcon, DoneIcon } from '@contentful/f36-icons';
import { FieldAppSDK } from '@contentful/app-sdk';
import { useSDK } from '@contentful/react-apps-toolkit';
import getFieldId from '../utility/getFieldId';
import convertBlobToBase64WithFormat from '../utility/convertBlobToBase64';

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();

  const IMAGE_FIELD_ID = getFieldId(sdk, 'image', f => f.type === 'Link' && f.linkType === 'Asset');
  const CONTENT_FIELD_ID = getFieldId(sdk, 'description', f => f.type === 'Text' || f.id.includes('description') || f.id.includes('alt'));
  const BYNDER_FIELD_ID = getFieldId(sdk, '', f => f.type === 'Object' || f.id.includes('bynder'));

  const contentField = sdk.entry.fields[CONTENT_FIELD_ID];
  const imageField = sdk.entry.fields[IMAGE_FIELD_ID];
  const bynderField = sdk.entry.fields[BYNDER_FIELD_ID];

  const [altText, setAltText] = useState(contentField.getValue() || '');
  const [hasGeneratedAltText, setHasGeneratedAltText] = useState(false);
  const [imageID, setImageID] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [bynderURL, setBynderURL] = useState('');
  const [isSet, setIsSet] = useState(false);
  const [isBroken, setIsBroken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addWarning, setAddWarning] = useState(false);

  const image = bynderURL || imageURL;

  const [installationToken, setInstallationToken] = useState('');
  
  useEffect(() => {
    // Installation token is directly available!
    const token = sdk.parameters.installation.accessToken;
    setInstallationToken(token);
  }, [sdk]);

  // Resize the field automatically
  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk.window]);

  // Watch Bynder field
  useEffect(() => {
    if (!bynderField) return;
    const detach = bynderField.onValueChanged((value) => {
      setBynderURL(value?.[0]?.src || '');
    });
    return () => detach();
  }, [bynderField]);

// 1. Field value changed → set image ID
useEffect(() => {
  if (!imageField) return;
  const detach = imageField.onValueChanged((value) => {
    if (value?.sys?.id) {
      setImageID(value.sys.id);
    } else {
      setImageURL('');
      setImageID('');
    }
  });
  return () => detach();
}, [imageField]);

// 2. Fetch asset when imageID is available
useEffect(() => {
  if (!imageID) return;

  let isCancelled = false;

  const checkAssetUntilReady = async (retries = 30) => {
    try {
      const asset = await sdk.cma.asset.get({ assetId: imageID });
      const rawUrl = asset.fields?.file?.['en-US']?.url;

      if (rawUrl) {
        const url = rawUrl.startsWith('//') ? `https:${rawUrl}` : rawUrl;
        if (!isCancelled) {
          setImageURL(url);
        }
      } else if (retries > 0) {
        setTimeout(() => checkAssetUntilReady(retries - 1), 2000);
      } else {
        setAddWarning(true);
        console.warn('Asset never became ready');
      }
    } catch (err) {
      console.error('Error fetching asset:', err);
    }
  };

  checkAssetUntilReady();

  return () => {
    isCancelled = true;
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [imageID]);

  const setInnerImageDescription = async (text: string) => {
    try {
      let asset = await sdk.cma.asset.get({ assetId: imageID });
      if (asset) {
        asset.fields.description = {
          ...asset.fields.description,
          'en-US': text
        };
      }
      asset = await sdk.cma.asset.update({ assetId: imageID }, asset);
      return await sdk.cma.asset.publish({ assetId: imageID }, asset);
    } catch (error) {
      console.error('Error updating asset description:', error);
    }
  };

  const handleUrlUpload = async (imageUrl: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const { base64, format } = await convertBlobToBase64WithFormat(blob);
      const backendResponse = await fetch("https://f3hm3c1641.execute-api.eu-central-1.amazonaws.com/alttext", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, format, apiKey: installationToken })
      });
      const { text } = await backendResponse.json();
      setAltText(text);
      contentField.setValue(text);
      await setInnerImageDescription(text);
      setIsSet(false);
      setHasGeneratedAltText(true);
    } catch (error) {
      setIsBroken(true);
      console.error("Error uploading image from URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setIsSet(true);
    try {
      fetch("https://f3hm3c1641.execute-api.eu-central-1.amazonaws.com/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ altText })
      });
    } catch (error) {
      setIsBroken(true);
      console.error("Error saving alt text:", error);
    }
  };

  const changeTextArea = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setAltText(value);
    sdk.field.setValue(value);
  };

  return (
    <>
      <Textarea
        value={altText}
        onChange={changeTextArea}
        onBlur={() => setInnerImageDescription(altText)}
        resize="none"
        style={{ height: "84px" }}
      />
      {addWarning && (
        <p style={{ paddingTop: ".5rem" }}>
          Please refresh the page to start generating alt text.
        </p>
      )}
      {isBroken ? (
        <p style={{ paddingTop: ".5rem" }}>
          There has been an error with the Alt Text Generator. Please try again later.
        </p>
      ) : (
        <ButtonGroup variant="spaced" spacing="spacingM">
          {isLoading ? (
            <Button isLoading style={{ marginTop: ".5rem" }}>Loading</Button>
          ) : hasGeneratedAltText ? (
            <Stack style={{ marginTop: ".5rem" }}>
              <Button 
                startIcon={isSet ? <DoneIcon /> : <></>} 
                isDisabled={isSet} 
                variant={isSet ? "secondary" : "primary"} 
                size="small" 
                onClick={handleSave}
              >
                {isSet ? "Saved" : "Save this"}
              </Button>
              <Button
                startIcon={<CycleIcon />}
                variant="secondary"
                size="small"
                onClick={() => handleUrlUpload(image)}
              >
                Generate new alt text
              </Button>
            </Stack>
          ) : (
            <Button
              startIcon={<CycleIcon />}
              isDisabled={!image}
              variant="primary"
              size="medium"
              style={{ marginTop: ".5rem" }}
              onClick={() => handleUrlUpload(image)}
            >
              {image ? "Generate alt text" : "Add an image to get started"}
            </Button>
          )}
        </ButtonGroup>
      )}
    </>
  );
};

export default Field;