package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class ValidateInvalidRemoteSessionCodeTest extends BaseTest {

    }

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testValidateInvalidRemoteSessionCodeReturnsNotFound() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/remote/session/validate?code=000000', { method: 'GET' })" +
            "  .then(res => res.json().then(data => done({status: res.status, success: data.success})))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        Object success = result.get("success");
        
        Assert.assertTrue("Validation failed expectedly", status == 404 || Boolean.FALSE.equals(success));
    }
}
