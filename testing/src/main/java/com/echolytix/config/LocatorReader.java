package com.echolytix.config;

import org.openqa.selenium.By;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.Properties;

/**
 * DevOps Centralized Object Repository Reader.
 * 
 * Reads all element locators (XPaths, CSS, IDs) from locator.properties.
 * Decouples DOM selectors from Java test code and Page Objects.
 * 
 * Key DevOps Capabilities:
 * - Single source of truth for all UI locators (update once in locator.properties, reflects everywhere).
 * - System Property Overrides: CI/CD pipelines can override any locator dynamically using:
 *     mvn test -Dlogin.email.input="//custom-xpath"
 * - Dynamic / Parameterized XPaths: Supports String.format interpolation with %s.
 */
public class LocatorReader {

    private static final Properties locators = new Properties();
    private static final String DEFAULT_LOCATOR_FILE = "locator.properties";
    private static boolean isLoaded = false;

    static {
        loadLocators();
    }

    private static synchronized void loadLocators() {
        if (isLoaded) {
            return;
        }

        // 1. Try ClassLoader (Classpath - Maven target/classes or target/test-classes)
        try (InputStream input = LocatorReader.class.getClassLoader().getResourceAsStream(DEFAULT_LOCATOR_FILE)) {
            if (input != null) {
                locators.load(input);
                isLoaded = true;
                return;
            }
        } catch (Exception e) {
            System.err.println("[LocatorReader] Could not load from classpath: " + e.getMessage());
        }

        // 2. Fallback to common file paths (useful during IDE execution or multi-module runs)
        String[] fallbackPaths = new String[] {
            "src/test/resources/" + DEFAULT_LOCATOR_FILE,
            "src/main/resources/" + DEFAULT_LOCATOR_FILE,
            "testing/src/test/resources/" + DEFAULT_LOCATOR_FILE,
            "testing/src/main/resources/" + DEFAULT_LOCATOR_FILE
        };

        for (String path : fallbackPaths) {
            File file = new File(path);
            if (file.exists()) {
                try (FileInputStream fis = new FileInputStream(file)) {
                    locators.load(fis);
                    isLoaded = true;
                    return;
                } catch (Exception e) {
                    System.err.println("[LocatorReader] Failed loading from path " + path + ": " + e.getMessage());
                }
            }
        }

        System.err.println("[LocatorReader] Warning: locator.properties could not be located. Relying on System properties.");
    }

    /**
     * Retrieves the raw locator string from locator.properties or System properties.
     *
     * @param key Property key defined in locator.properties
     * @return Locator string (e.g. XPath)
     */
    public static String get(String key) {
        // Allow CI/CD or command-line overrides via -Dkey=value
        String sysProp = System.getProperty(key);
        if (sysProp != null && !sysProp.isBlank()) {
            return sysProp.trim();
        }

        String value = locators.getProperty(key);
        if (value == null) {
            throw new IllegalArgumentException(
                "[DevOps Object Repository] Locator key not found: '" + key + "' in locator.properties."
            );
        }
        return value.trim();
    }

    /**
     * Retrieves dynamic locator string with parameterized arguments (via String.format).
     *
     * @param key  Property key defined in locator.properties
     * @param args Dynamic tokens to inject into %s placeholders
     * @return Formatted locator string
     */
    public static String get(String key, Object... args) {
        String template = get(key);
        return String.format(template, args);
    }

    /**
     * Resolves a Selenium By locator from locator.properties.
     *
     * @param key Property key defined in locator.properties
     * @return Selenium By instance (By.xpath, By.cssSelector, By.id, etc.)
     */
    public static By getBy(String key) {
        return parseBy(get(key));
    }

    /**
     * Resolves a dynamic Selenium By locator with parameterized arguments.
     *
     * @param key  Property key defined in locator.properties
     * @param args Dynamic tokens to inject into %s placeholders
     * @return Selenium By instance
     */
    public static By getBy(String key, Object... args) {
        return parseBy(get(key, args));
    }

    /**
     * Parses locator string into corresponding Selenium By strategy.
     * Defaults to By.xpath if no explicit prefix is specified.
     */
    private static By parseBy(String locator) {
        if (locator == null || locator.isBlank()) {
            throw new IllegalArgumentException("[DevOps Object Repository] Cannot parse empty locator string.");
        }

        if (locator.startsWith("xpath:")) {
            return By.xpath(locator.substring("xpath:".length()).trim());
        } else if (locator.startsWith("css:")) {
            return By.cssSelector(locator.substring("css:".length()).trim());
        } else if (locator.startsWith("id:")) {
            return By.id(locator.substring("id:".length()).trim());
        } else if (locator.startsWith("name:")) {
            return By.name(locator.substring("name:".length()).trim());
        } else if (locator.startsWith("class:")) {
            return By.className(locator.substring("class:".length()).trim());
        } else if (locator.startsWith("tag:")) {
            return By.tagName(locator.substring("tag:".length()).trim());
        }

        // Default to By.xpath
        return By.xpath(locator);
    }
}
