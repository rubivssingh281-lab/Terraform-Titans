package com.echolytix.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class HandSignGesturePage extends BasePage {

    // Header & Section Locators
    private final By translationHeading = By.xpath("//h2[contains(., 'Translation')]");
    private final By gestureEngineTitle = By.xpath("//div[contains(text(), 'Geometric Gesture Engine')]");
    private final By handDetectBadge = By.xpath("//span[contains(text(), 'Hand Detected') or contains(text(), 'No Hand')]");

    // Gesture & Output Locators
    private final By currentGestureValue = By.xpath("//span[text()='CURRENT GESTURE']/following-sibling::div//div[contains(@class, 'text-2xl')]");
    private final By constructedPhraseContainer = By.xpath("//span[text()='CONSTRUCTED PHRASE']/following-sibling::div/div[1]");

    // HUD Metrics
    private final By confidenceValue = By.xpath("//span[text()='CONFIDENCE']/following-sibling::span");
    private final By fpsValue = By.xpath("//span[text()='FPS']/following-sibling::span");

    // Camera Controls
    private final By webcamToggleButton = By.xpath("//button[contains(., 'Use Real Webcam') or contains(., 'Close Camera')]");
    private final By skeletonCheckbox = By.xpath("//label[contains(., 'Skeleton Overlay')]//input[@type='checkbox']");

    // Voice & Speech Controls (Scoped directly to label parents)
    private final By voiceSelectDropdown = By.xpath("//div[contains(., 'Voice Selection')]/select");
    private final By speedRateSlider = By.xpath("//span[text()='Speed Rate']/ancestor::div[1]/following-sibling::input[@type='range']");
    private final By speedRateDisplay = By.xpath("//span[text()='Speed Rate']/following-sibling::span");
    private final By pitchSlider = By.xpath("//span[text()='Pitch']/ancestor::div[1]/following-sibling::input[@type='range']");
    private final By pitchDisplay = By.xpath("//span[text()='Pitch']/following-sibling::span");

    // Action Buttons
    private final By deleteWordButton = By.xpath("//button[contains(., 'Delete Word')]");
    private final By clearAllButton = By.xpath("//button[contains(., 'Clear All')]");
    private final By submitButton = By.xpath("//button[contains(., 'Submit')]");
    private final By aiCompleteButton = By.xpath("//button[contains(., 'AI Complete')]");
    private final By speakOutputButton = By.xpath("//button[@title='Speak Output']");

    // Cheat Sheet Header
    private final By cheatSheetHeader = By.xpath("//h3[contains(., 'Gesture Cheat Sheet')]");

    public HandSignGesturePage(WebDriver driver) {
        super(driver);
    }

    public void waitForPageLoaded() {
        waitForVisibility(translationHeading);
        waitForVisibility(cheatSheetHeader);
    }

    public boolean isPageLoaded() {
        return isDisplayed(translationHeading, 5) && isDisplayed(cheatSheetHeader, 5);
    }

    public String getCurrentGesture() {
        return getText(currentGestureValue);
    }

    public String getConstructedPhrase() {
        return getText(constructedPhraseContainer);
    }

    public String getConfidenceScore() {
        return getText(confidenceValue);
    }

    public String getFpsScore() {
        return getText(fpsValue);
    }

    /**
     * Click a gesture from the Gesture Cheat Sheet (e.g. "HELLO", "HELP", "YES", etc.)
     */
    public void selectGesture(String gestureName) {
        By gestureButtonLocator = By.xpath(
                String.format("//h3[contains(., 'Gesture Cheat Sheet')]/following-sibling::div//button[.//span[text()='%s'] or contains(., '%s')]",
                        gestureName, gestureName)
        );
        jsClick(gestureButtonLocator);

        // Wait until Current Gesture displays this gesture name to ensure React state has rendered
        try {
            wait.until(d -> getCurrentGesture().equalsIgnoreCase(gestureName));
        } catch (Exception ignored) {
        }
    }

    public void clickDeleteWord() {
        String phraseBefore = getConstructedPhrase();
        jsClick(deleteWordButton);

        try {
            wait.until(d -> !getConstructedPhrase().equals(phraseBefore));
        } catch (Exception ignored) {
        }
    }

    public void clickClearAll() {
        jsClick(clearAllButton);

        try {
            wait.until(d -> getConstructedPhrase().contains("Perform gesture...") || getConstructedPhrase().isBlank());
        } catch (Exception ignored) {
        }
    }

    public void clickSubmit() {
        jsClick(submitButton);
    }

    public void clickSpeakOutput() {
        jsClick(speakOutputButton);
    }

    public boolean isDeleteWordEnabled() {
        try {
            WebElement btn = driver.findElement(deleteWordButton);
            return btn.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isSubmitEnabled() {
        try {
            WebElement btn = driver.findElement(submitButton);
            return btn.isEnabled();
        } catch (Exception e) {
            return false;
        }
    }

    public void toggleWebcam() {
        String currentText = getWebcamButtonText();
        jsClick(webcamToggleButton);

        try {
            wait.until(d -> !getWebcamButtonText().equals(currentText));
        } catch (Exception ignored) {
        }
    }

    public String getWebcamButtonText() {
        return getText(webcamToggleButton);
    }

    public void toggleSkeletonOverlay() {
        boolean before = isSkeletonOverlayChecked();
        jsClick(skeletonCheckbox);

        try {
            wait.until(d -> isSkeletonOverlayChecked() != before);
        } catch (Exception ignored) {
        }
    }

    public boolean isSkeletonOverlayChecked() {
        WebElement checkbox = driver.findElement(skeletonCheckbox);
        return checkbox.isSelected();
    }

    public void setSpeedRate(double rate) {
        WebElement slider = driver.findElement(speedRateSlider);
        String script =
                "var input = arguments[0];" +
                "var value = arguments[1];" +
                "var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
                "if (nativeSetter) { nativeSetter.call(input, value); } else { input.value = value; }" +
                "input.dispatchEvent(new Event('input', { bubbles: true }));" +
                "input.dispatchEvent(new Event('change', { bubbles: true }));";
        executeScript(script, slider, String.valueOf(rate));
        try {
            wait.until(d -> getSpeedRateDisplay().equals(rate + "x"));
        } catch (Exception ignored) {
        }
    }

    public String getSpeedRateDisplay() {
        return getText(speedRateDisplay);
    }

    public void setPitch(double pitch) {
        WebElement slider = driver.findElement(pitchSlider);
        String script =
                "var input = arguments[0];" +
                "var value = arguments[1];" +
                "var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;" +
                "if (nativeSetter) { nativeSetter.call(input, value); } else { input.value = value; }" +
                "input.dispatchEvent(new Event('input', { bubbles: true }));" +
                "input.dispatchEvent(new Event('change', { bubbles: true }));";
        executeScript(script, slider, String.valueOf(pitch));
        try {
            wait.until(d -> getPitchDisplay().equals(pitch + "x"));
        } catch (Exception ignored) {
        }
    }

    public String getPitchDisplay() {
        return getText(pitchDisplay);
    }

    public boolean isFingerSignalDisplayed(String fingerName) {
        By locator = By.xpath(String.format("//span[text()='Live Finger Signal']/following-sibling::div//span[text()='%s']", fingerName));
        return isDisplayed(locator, 3);
    }
}
