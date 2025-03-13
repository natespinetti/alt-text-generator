import React, { useState, useEffect } from 'react';
import { Button, Textarea, ButtonGroup, Stack } from '@contentful/f36-components';
import { FieldAppSDK } from '@contentful/app-sdk';
import { /* useCMA, */ useSDK } from '@contentful/react-apps-toolkit';
import { createClient } from 'contentful-management';
import { CycleIcon, DoneIcon } from '@contentful/f36-icons';

const Field = () => {
  const sdk = useSDK<FieldAppSDK>();

  const imageFind = sdk.contentType.fields.find((f) => f.type === 'Link' && f.linkType === 'Asset');
  const IMAGE_FIELD_ID = imageFind ? imageFind.id : 'image';

  const contentFind = sdk.contentType.fields.find((f) => f.type === 'Text' || f.id.includes('description') || f.id.includes('alt'));
  const CONTENT_FIELD_ID = contentFind ? contentFind.id : 'description';

  const bynderFind = sdk.contentType.fields.find((f) => f.type === 'Object' || f.id.includes('bynder'));
  const BYNDER_FIELD_ID = bynderFind ? bynderFind.id : '';

  const cmaClient = createClient({
    apiAdapter: sdk.cmaAdapter
  });

  // get the current value of the content field
  const contentField = sdk.entry.fields[CONTENT_FIELD_ID];
  const [OGText, setOGText] = useState(contentField.getValue() || '');

  // get the current value of the image field
  const imageField = sdk.entry.fields[IMAGE_FIELD_ID];
  const [imageURL, setImageURL] = useState("");
  const [imageID, setImageID] = useState("");

  // get the current value of the image field
  const bynderField = sdk.entry.fields[BYNDER_FIELD_ID];
  const [bynderURL, setBynderURL] = useState("");

  // set the alt text to the current value of the content field -- will update
  const [altText, setAltText] = useState(contentField.getValue() || '');
  const [isSet, setIsSet] = useState(false);
  const [image, setImage] = useState("");
  const [isBroken, setIsBroken] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // This ensures our app has enough space to render
    sdk.window.startAutoResizer();
  });

  useEffect(() => {
    if (bynderURL) {
      setImage(bynderURL);
    } else if (imageURL) {
      setImage(imageURL);
    } else {
      setImage("");
    }
  }, [bynderURL, imageURL]);

  // Fetch image asset from Bynder
  useEffect(() => {
    if (bynderField) {
      const detach = bynderField.onValueChanged(async (value) => {
        if (value && value.length > 0) {
          setBynderURL(value[0].src);
        } else {
          setBynderURL("");
        }
      });
      return () => detach();
    }
  }, [bynderField]);

  // Fetch image asset from media upload -- Poll every 3 seconds to see if media is published
  useEffect(() => {
    if (imageField) {
      const detach = imageField.onValueChanged(async (value) => {
        if (value && value.sys && value.sys.id) {
          try {
            const environment = await cmaClient.getSpace(sdk.ids.space).then(space => space.getEnvironment(sdk.ids.environment));
            const checkIfPublished = async () => {
              const updatedAsset = await environment.getAsset(value.sys.id);
              if (updatedAsset.sys.publishedVersion) {
                const imageUrl = updatedAsset.fields.file[sdk.locales.default].url;
                setImageURL(`https:${imageUrl}`);
              } else {
                setTimeout(checkIfPublished, 3000); // Poll every 3 seconds
              }
            };
            setImageID(imageField.getValue()?.sys?.id);
            checkIfPublished();
    
          } catch (error) {
            console.error('Error fetching asset:', error);
          }
        } else {
          setImageURL("");
        }
      });
    
      return () => detach();
    }
  }, [imageField, cmaClient, sdk]);  

	// Image upload from URL
  const handleUrlUpload = async (imageUrl: string) => {
    setIsLoading(true);
		try {
			// Fetch the image from the URL
			const response = await fetch(imageUrl);
			const blob = await response.blob();
      setAltText("");

			// Convert the blob to base64
			const { base64, format } = await convertBlobToBase64WithFormat(blob)

			// Send the base64-encoded image to the backend
			const backendResponse = await fetch(
				"https://f3hm3c1641.execute-api.eu-central-1.amazonaws.com/alttext",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ image: base64, format: format }),
				}
			)

			const data = await backendResponse.json()
			setAltText(data.text);
      contentField.setValue(data.text);
      await setInnerImageDescription(data.text);
		} catch (error) {
      setIsBroken(true);
			console.error("Error uploading image from URL:", error)
		} finally {
      setIsLoading(false);
    }
	}

  const setInnerImageDescription = async (text: string) => {
    try {
      const asset = await sdk.cma.asset.get({ assetId: imageID });
  
      asset.fields.description = {
        ...asset.fields.description,
        'en-US': text
      };
  
      const updatedAsset = await sdk.cma.asset.update(
        { assetId: imageID },
        asset
      );
  
      const publishedAsset = await sdk.cma.asset.publish(
        { assetId: imageID },
        updatedAsset
      );
  
      return publishedAsset;
    } catch (error) {
      console.error('Error updating asset description:', error);
    }
  };  

  // Convert Blob to Base64 with format extraction
  const convertBlobToBase64WithFormat = (
    blob: Blob
  ): Promise<{ base64: string; format: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64data = reader.result as string

        // Extract the format from the data URL prefix
        const formatMatch = base64data.match(
          /^data:image\/(png|webp|svg\+xml|jpeg|jpg);base64,/
        )
        let format = "unknown"
        if (formatMatch && formatMatch.length > 1) {
          // Convert 'jpeg' to 'jpg' to standardize the format
          format = formatMatch[1] === "jpeg" ? "jpg" : formatMatch[1]
        }

        // Remove the data URL prefix and resolve with base64 and format
        const base64 = base64data.split(",")[1]
        resolve({ base64, format })
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const handleSave = () => {
    setOGText(altText);
    setIsSet(true);

    try {
      fetch(
        "https://f3hm3c1641.execute-api.eu-central-1.amazonaws.com/update",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            altText: altText,
          }),
        }
      )
    } catch (error) {
      setIsBroken(true);
      console.error("Error uploading image from URL:", error)
    }
  }

  const changeTextArea = (e: { target: { value: any; }; }) => {
    setAltText(e.target.value);
    setOGText(e.target.value);
  }

  return ( 
    <>
      <Textarea
        value={altText}
        onChange={(e) => changeTextArea(e)}
        resize="none"
        style={{height: "84px"}}
      />
      {isBroken ? (
        <p style={{paddingTop: ".5rem"}}>There has been an error with the Alt Text Generator. Please try again later.</p>
      ) : (
        <ButtonGroup variant="spaced" spacing="spacingM">
        {isLoading ? (
          <Button isLoading style={{ marginTop: ".5rem" }}>Loading</Button>
        ) : OGText === altText ? (
          <>
            {isSet ? ( 
              <Stack style={{ marginTop: ".5rem" }}>
                <Button startIcon={<DoneIcon />} size="small" isDisabled={true}>
                  Saved
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
                isDisabled={image === ""} 
                variant="primary" 
                size="medium" 
                style={{ marginTop: ".5rem" }} 
                onClick={() => handleUrlUpload(image)}
              >
                {image === "" ? "Add an image to get started" : "Generate alt text"}
              </Button>
            )}
          </>
        ) : altText !== "" ? (
          <>
            <Stack style={{ marginTop: ".5rem" }}>
              <Button variant="primary" size="small" onClick={handleSave}>
                Save this
              </Button>
              <Button startIcon={<CycleIcon />} variant="secondary" size="small" onClick={() => handleUrlUpload(image)}>
                Generate new alt text
              </Button>
            </Stack>
          </>
        ) : (
          <Button isLoading style={{ marginTop: ".5rem" }}>Loading</Button>
        )}
      </ButtonGroup>

      )}
    </>
  );
};

export default Field;