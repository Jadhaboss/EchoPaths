
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Modality } from "@google/genai";
import { RouteDetails, StorySegment, StoryStyle } from "../types";
import { decode, decodeAudioData } from "./audioUtils";

// Fix: Always initialize Gemini API client exactly as specified in guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TARGET_SEGMENT_DURATION_SEC = 60; 
const WORDS_PER_MINUTE = 145;
const WORDS_PER_SEGMENT = Math.round((TARGET_SEGMENT_DURATION_SEC / 60) * WORDS_PER_MINUTE);

export const calculateTotalSegments = (durationSeconds: number): number => {
    return Math.max(1, Math.ceil(durationSeconds / TARGET_SEGMENT_DURATION_SEC));
};

const getStyleInstruction = (style: StoryStyle): string => {
    switch (style) {
        case 'NOIR':
            return "Style: Noir Thriller. Gritty, cynical, atmospheric. Use inner monologue. The traveler is a detective or someone with a troubled past. The city is a character itself—dark, rainy, hiding secrets.";
        case 'CHILDREN':
            return "Style: Children's Story. Whimsical, magical, full of wonder and gentle humor. The world is bright and alive; animate inanimate objects.";
        case 'HISTORICAL':
            return "Style: Historical Epic. Grandiose, dramatic, and timeless. Treat the journey as a significant pilgrimage.";
        case 'FANTASY':
            return "Style: Fantasy Adventure. Heroic, mystical, and epic. The real world is just a veil over a magical realm.";
        default:
            return "Style: Immersive, 'in the moment' narration.";
    }
};

export const generateStoryOutline = async (
    route: RouteDetails,
    totalSegments: number
): Promise<string[]> => {
    const styleInstruction = getStyleInstruction(route.storyStyle);
    const stopsStr = route.waypoints && route.waypoints.length > 0 
      ? `Intermediate stops: ${route.waypoints.join(', ')}.` 
      : "";

    const prompt = `
    You are an expert storyteller. Write an outline for a story that is exactly ${totalSegments} chapters long.
    
    Journey Details:
    From: ${route.startAddress}
    To: ${route.endAddress}
    ${stopsStr}
    Duration: ${route.duration}
    
    ${styleInstruction}

    Ensure the story arc includes the intermediate stops naturally as milestones in the journey.
    Output strictly valid JSON: An array of ${totalSegments} strings representing chapter summaries.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = response.text?.trim();
        if (!text) throw new Error("No outline generated.");
        return JSON.parse(text).slice(0, totalSegments);
    } catch (error) {
        return Array(totalSegments).fill("Continue the immersive journey through the landscape.");
    }
};

export const generateSegment = async (
    route: RouteDetails,
    segmentIndex: number,
    totalSegmentsEstimate: number,
    segmentOutline: string,
    previousContext: string = ""
): Promise<StorySegment> => {
  const styleInstruction = getStyleInstruction(route.storyStyle);
  const stopsStr = route.waypoints && route.waypoints.length > 0 
    ? `Waypoints to keep in mind: ${route.waypoints.join(', ')}.` 
    : "";

  const prompt = `
    Generate segment ${segmentIndex} of ${totalSegmentsEstimate} for an immersive travel narrative.
    
    Route: ${route.startAddress} to ${route.endAddress}.
    ${stopsStr}
    
    ${styleInstruction}
    Current Goal: ${segmentOutline}
    Previous Content Summary: ${previousContext.slice(-500)}

    Write ~${WORDS_PER_SEGMENT} words. Focus on the sensory experience of movement.
    Output ONLY the raw narrative text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return {
      index: segmentIndex,
      text: response.text?.trim() || "The journey continues through the shifting light.",
      audioBuffer: null 
    };
  } catch (error) {
    throw error;
  }
};

export const generateSegmentAudio = async (text: string, audioContext: AudioContext, voiceName: string = 'Kore'): Promise<AudioBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName } }
        }
      }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    if (!audioData) throw new Error("No audio data.");

    // Fix: Use recommended decode and decodeAudioData functions to process raw PCM audio data.
    return await decodeAudioData(decode(audioData), audioContext, 24000, 1);
  } catch (error) {
    throw error;
  }
};
