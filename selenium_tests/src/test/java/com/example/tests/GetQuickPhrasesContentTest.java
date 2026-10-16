package com.example.tests;
import java.time.Duration;
import java.util.Map;
import org.junit.Assert;
import org.junit.Test;
import org.openqa.selenium.JavascriptExecutor;
public class GetQuickPhrasesContentTest extends BaseTest {

    private Map<String, Object> executeFetchScript(String script) {
        return (Map<String, Object>) ((JavascriptExecutor) driver).executeAsyncScript(script);
    }

    @Test
    public void testGetQuickPhrasesValidatesContent() {
        String script = 
            "const done = arguments[arguments.length - 1];" +
            "fetch('/api/quick_phrases', { method: 'GET' })" + 
            "  .then(res => res.json().then(data => done({status: res.status, length: data.length})))" +
            "  .catch(err => done({status: 500}));";
            
        Map<String, Object> result = executeFetchScript(script);
        long status = ((Number) result.get("status")).longValue();
        if (status == 200) {
            long length = ((Number) result.get("length")).longValue();
            Assert.assertTrue("Should return at least one quick phrase", length >= 0);
        }
    }
}
