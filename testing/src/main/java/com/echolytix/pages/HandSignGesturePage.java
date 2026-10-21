package com.echolytix.pages;

import com.echolytix.config.LocatorReader;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class HandSignGesturePage extends BasePage {

    // Header & Section Locators
    private final By translationHeading = LocatorReader.getBy("handsign.translation.heading");
    private final By gestureEngineTitle = LocatorReader.getBy("handsign.gesture.engine.title");
    private final By handDetectBadge = LocatorReader.getBy("handsign.hand.detect.badge");

    // Gesture & Output Locators
    private final By currentGestureValue = LocatorReader.getBy("handsign.current.gesture.value");
    private final By constructedPhraseContainer = LocatorReader.getBy("handsign.constructed.phrase.container");

    // HUD Metrics
    private final By confidenceValue = LocatorReader.getBy("handsign.confidence.value");
    private final By fpsValue = LocatorReader.getBy("handsign.fps.value");

    // Camera Controls
    private final By webcamToggleButton = LocatorReader.getBy("handsign.webcam.toggle.button");
    private final By skeletonCheckbox = LocatorReader.getBy("handsign.skeleton.checkbox");

    // Voice & Speech Controls
    private final By voiceSelectDropdown = LocatorReader.getBy("handsign.voice.select.dropdown");
    private final By speedRateSlider = LocatorReader.getBy("handsign.speed.rate.slider");
    private final By speedRateDisplay = LocatorReader.getBy("handsign.speed.rate.display");
    private final By pitchSlider = LocatorReader.getBy("handsign.pitch.slider");
    private final By pitchDisplay = LocatorReader.getBy("handsign.pitch.display");

    // Action Buttons
    private final By deleteWordButton = LocatorReader.getBy("handsign.delete.word.button");
    private final By clearAllButton = LocatorReader.getBy("handsign.clear.all.button");
    private final By submitButton = LocatorReader.getBy("handsign.submit.button");
    private final By aiCompleteButton = LocatorReader.getBy("handsign.ai.complete.button");
    private final By speakOutputButton = LocatorReader.getBy("handsign.speak.output.button");

    // Cheat Sheet Header
    private final By cheatSheetHeader = LocatorReader.getBy("handsign.cheat.sheet.header");

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
        By gestureButtonLocator = LocatorReader.getBy("handsign.cheat.sheet.gesture.button", gestureName, gestureName);
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
        By locator = LocatorReader.getBy("handsign.live.finger.signal", fingerName);
        return isDisplayed(locator, 3);
    }
}
