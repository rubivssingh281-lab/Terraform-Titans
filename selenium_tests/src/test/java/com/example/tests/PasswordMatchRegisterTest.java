import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import java.time.Duration;
import java.util.List;

public class PasswordMatchRegisterTest {
    public static void main(String[] args) {
        WebDriver driver = new ChromeDriver();
        
        try {
            driver.get("http://localhost:3000");
            
            WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
            
            WebElement registerLink = wait.until(ExpectedConditions.elementToBeClickable(By.xpath("//button[contains(text(), 'Register Account')]")));
            registerLink.click();
            
            WebElement nameInput = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//input[@placeholder='Stephen Hawking']")));
            nameInput.sendKeys("Test User");
            
            List<WebElement> emailInputs = driver.findElements(By.xpath("//input[@placeholder='name@example.com']"));
            for (WebElement e : emailInputs) {
                if (e.isDisplayed()) {
                    e.sendKeys("testuser@example.com");
                    break;
                }
            }
            
            WebElement passInput = driver.findElement(By.xpath("//input[@placeholder='Min 8 chars, letter & number']"));
            passInput.sendKeys("ValidPass123");
            
            WebElement confirmPassInput = driver.findElement(By.xpath("//input[@placeholder='Re-type password']"));
            confirmPassInput.sendKeys("MismatchPass123");
            
            WebElement registerButton = driver.findElement(By.xpath("//button[contains(., 'REGISTER NEW PATIENT')]"));
            registerButton.click();
            
            WebElement errorMsg = wait.until(ExpectedConditions.visibilityOfElementLocated(By.xpath("//span[contains(text(), 'Passwords do not match.')]")));
            
            if (errorMsg.isDisplayed()) {
                System.out.println("Test Passed: Password mismatch error is displayed correctly.");
            } else {
                System.out.println("Test Failed: Password mismatch error was not displayed.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("Test Failed: An exception occurred.");
        } finally {
            driver.quit();
        }
    }
}
