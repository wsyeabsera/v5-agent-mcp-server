import { UserPreference } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Learn from user corrections
 */
export async function learnFromCorrection(
  userContext: string,
  original: any,
  corrected: any,
  context: string
): Promise<void> {
  try {
    logger.debug(`[UserPreferenceLearner] Learning from correction for user: ${userContext}`);

    const userPref = await UserPreference.findOneAndUpdate(
      { userContext },
      {
        $push: {
          corrections: {
            original,
            corrected,
            context,
            timestamp: new Date(),
          },
        },
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    // Extract preference patterns
    await extractPreferencePatterns(userContext, userPref);

    logger.debug(`[UserPreferenceLearner] Completed learning from correction`);
  } catch (error: any) {
    logger.error('[UserPreferenceLearner] Error learning from correction:', error);
  }
}

/**
 * Extract preference patterns from corrections
 */
async function extractPreferencePatterns(
  userContext: string,
  userPref: any
): Promise<void> {
  try {
    if (!userPref || userPref.corrections.length === 0) return;

    // Analyze corrections to extract patterns
    const toolPreferences = new Map<string, number>();
    const parameterDefaults = new Map<string, any>();
    const behaviorPatterns: Array<{ pattern: string; frequency: number; context: string }> = [];

    for (const correction of userPref.corrections) {
      // Extract tool preferences (if correction involves tool selection)
      if (correction.original.toolName && correction.corrected.toolName) {
        const correctedTool = correction.corrected.toolName;
        const currentScore = toolPreferences.get(correctedTool) || 0;
        toolPreferences.set(correctedTool, currentScore + 1);
      }

      // Extract parameter defaults (if correction involves parameter values)
      if (correction.original.parameters && correction.corrected.parameters) {
        for (const [key, value] of Object.entries(correction.corrected.parameters)) {
          if (!parameterDefaults.has(key)) {
            parameterDefaults.set(key, value);
          }
        }
      }

      // Extract behavior patterns
      const pattern = JSON.stringify(correction.corrected);
      const existingPattern = behaviorPatterns.find(p => p.pattern === pattern);
      if (existingPattern) {
        existingPattern.frequency += 1;
      } else {
        behaviorPatterns.push({
          pattern,
          frequency: 1,
          context: correction.context,
        });
      }
    }

    // Update user preferences
    await UserPreference.findByIdAndUpdate(userPref._id, {
      $set: {
        'preferences.toolPreferences': Object.fromEntries(toolPreferences),
        'preferences.parameterDefaults': Object.fromEntries(parameterDefaults),
        patterns: behaviorPatterns.slice(0, 20), // Keep top 20 patterns
        lastUpdated: new Date(),
      },
    });

    logger.debug(`[UserPreferenceLearner] Extracted ${toolPreferences.size} tool preferences, ${parameterDefaults.size} parameter defaults`);
  } catch (error: any) {
    logger.error('[UserPreferenceLearner] Error extracting preference patterns:', error);
  }
}

/**
 * Get user preferences for a context
 */
export async function getUserPreferences(
  userContext: string
): Promise<any | null> {
  try {
    return await UserPreference.findOne({ userContext }).lean();
  } catch (error: any) {
    logger.error('[UserPreferenceLearner] Error getting user preferences:', error);
    return null;
  }
}

