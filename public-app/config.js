/*
 * Giftnify app settings, read when the app starts.
 *
 * GIFTNIFY_API_URL is the address of your Giftnify WEBSITE (the app gets all
 * its data from it). Leave it empty to use the address the app was built with.
 *
 *   Live website ............ "https://giftnify.app"
 *   Android emulator + your
 *   computer's local site ... "http://10.0.2.2:8000"
 *   Real phone on same Wi-Fi  "http://192.168.x.x:8000"  (your computer's IP)
 */
window.GIFTNIFY_API_URL = window.GIFTNIFY_API_URL || "";
