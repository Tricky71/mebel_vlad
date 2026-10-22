(function () {
	var key = "glass_pd_consent";
	var bar = document.getElementById("glass-cookie-bar");
	if (!bar) return;
	var done = document.cookie.split("; ").some(function (c) { return c.indexOf(key + "=") === 0; });
	if (done) return;
	bar.hidden = false;
	function set(val) {
		var max = 60 * 60 * 24 * 180;
		var secure = location.protocol === "https:" ? "; Secure" : "";
		document.cookie = key + "=" + val + "; path=/; max-age=" + max + "; SameSite=Lax" + secure;
		bar.hidden = true;
		if (val === "1") window.location.reload();
	}
	bar.addEventListener("click", function (e) {
		if (e.target.closest("[data-cookie-accept]")) set("1");
		if (e.target.closest("[data-cookie-reject]")) set("necessary");
	});
})();
