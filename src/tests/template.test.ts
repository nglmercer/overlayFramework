import { describe, it, expect } from 'bun:test';
import { processTemplate } from '../lib/core/template-processor';
import { PLATFORM_EVENTS } from '../lib/core/platform-events';

// Import sample data (require works for JSON in Bun)
const kickChatSample = require('../../schemas/sample/kick_ChatMessageEvent.json');
const tiktokChatSample = require('../../schemas/sample/tiktok_chat.json');
const tiktokGiftSample = require('../../schemas/sample/tiktok_gift.json');
const tiktokSocialSample = require('../../schemas/sample/tiktok_social.json');

describe('Template Replacement Tests', () => {
  it('should format Kick Chat correctly', () => {
    const event = PLATFORM_EVENTS['kick_chat'];
    // Map sample JSON to expected template variables
    const eventData = {
      username: kickChatSample.sender.username,
      message: kickChatSample.content
    };
    
    const result = processTemplate(event.defaultMessage, eventData);
    expect(result).toContain(eventData.username);
    expect(result).toContain(eventData.message);
    expect(result).toContain('color: #9146FF'); // Default highlight color
  });

  it('should format TikTok Chat correctly', () => {
    const event = PLATFORM_EVENTS['tiktok_chat'];
    const eventData = {
      username: tiktokChatSample.uniqueId,
      message: tiktokChatSample.comment
    };
    
    const result = processTemplate(event.defaultMessage, eventData);
    expect(result).toContain(eventData.username);
    expect(result).toContain(eventData.message);
  });

  it('should format TikTok Gift correctly', () => {
    const event = PLATFORM_EVENTS['tiktok_gift'];
    const eventData = {
      username: tiktokGiftSample.uniqueId,
      giftName: tiktokGiftSample.giftName,
      amount: tiktokGiftSample.repeatCount.toString()
    };
    
    const result = processTemplate(event.defaultMessage, eventData);
    expect(result).toContain(eventData.username);
    expect(result).toContain(eventData.giftName);
    expect(result).toContain(eventData.amount);
  });

  it('should highlight missing variables', () => {
    const message = 'Hello {username}, you contributed {amount} bits!';
    const eventData = { username: 'test_user' };
    
    const result = processTemplate(message, eventData);
    expect(result).toContain('test_user');
    expect(result).toContain('<span style="color: #9146FF; font-weight: bold;">amount</span>');
  });
});
