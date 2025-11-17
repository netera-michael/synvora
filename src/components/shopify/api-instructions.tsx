export function APIInstructions() {
  return (
    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-3">
      <h3 className="font-semibold text-blue-900">How to get Shopify API credentials:</h3>
      <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
        <li>
          Go to your <strong>Shopify admin</strong> dashboard
        </li>
        <li>
          Navigate to <strong>Settings</strong> → <strong>Apps and sales channels</strong>
        </li>
        <li>
          Click <strong>&quot;Develop apps&quot;</strong> (you may need to allow custom app development first)
        </li>
        <li>
          Click <strong>&quot;Create an app&quot;</strong> and name it <strong>&quot;Synvora Sync&quot;</strong>
        </li>
        <li>
          Go to <strong>Configuration</strong> tab → <strong>Admin API integration</strong>
        </li>
        <li>
          Configure the following <strong>Admin API scopes</strong>:
          <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
            <li><code className="bg-blue-100 px-1 rounded">read_orders</code> (required)</li>
            <li><code className="bg-blue-100 px-1 rounded">read_products</code> (optional)</li>
          </ul>
        </li>
        <li>
          Click <strong>Save</strong>, then go to <strong>API credentials</strong> tab
        </li>
        <li>
          Click <strong>&quot;Install app&quot;</strong> to install it on your store
        </li>
        <li>
          Copy the <strong>Admin API access token</strong> (starts with <code className="bg-blue-100 px-1 rounded">shpat_</code>)
        </li>
        <li>
          Your <strong>store domain</strong> is: <code className="bg-blue-100 px-1 rounded">your-store-name.myshopify.com</code>
        </li>
      </ol>
      <p className="text-xs text-blue-700 pt-2 border-t border-blue-200">
        ⚠️ <strong>Important:</strong> Keep your access token secure. Never share it publicly or commit it to version control.
      </p>
    </div>
  );
}
