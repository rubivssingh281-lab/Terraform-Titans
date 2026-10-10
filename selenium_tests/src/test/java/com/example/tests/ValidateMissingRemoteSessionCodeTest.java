package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class ValidateMissingRemoteSessionCodeTest extends BaseTest {

    }

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testValidateMissingRemoteSessionCodeReturnsBadRequest() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/remote/session/validate', { method: 'GET' })" + // No code parameter
            "  .then(res => done({status: res.status}))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Assert.assertTrue("Status should be bad request or not found", status == 400 || status == 404);
    }
}
