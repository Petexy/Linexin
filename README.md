# Linexin

<p align="center">
  <img src="https://i.imgur.com/qZRvycj.png" alt="logo" with="200" height="200"/>
</p>
<br>

<h2>What is Linexin?</h2>
Linexin is a Linux distribution based on Arch Linux. It is designed to be a fast and user-friendly operating system, pre-configured for creative professionals and gamers. Additionally, thanks to Arch Linux running under the hood, it allows for the newest and greatest patches as soon as they get released. 

<h2>How do I download Linexin?</h2>
Due to the size being bigger than GitHub allows for a release, the download is present on the Linexin's webpage only.<br>
<a href="https://petexy.github.io/Linexin">Download Linexin</a>

<h2>Why Linexin instead of...?</h2>
If you're a creator, you probably know that running Affinity suite and DaVinci Resolve (on any other distro than RedHat Linux) can be problematic on Linux. When creating Linexin, it was it's main goal to allow for an easy install and usage of these apps without any console commands - using <strong>only GUI</strong>. So what are all other goals that Linexin wants to target?:<br><br>
 <ul>
  <li>User-friendly installation of DaVinci Resolve and Affinity suite</li>
  <li>Easy installation</li>
  <li>Great Gaming Experience for Steam</li>
  <li>GUI presets for everyone</li>
  <li>The newest software</li>
  <li>Flatpak and AppImage support out of the box</li>
  <li>Fast. Really fast. No unnecessary bloat</li>
</ul> <br>

<h2>How does it look like?</h2>
It depends. Default UI is a modified GNOME Desktop Environment to be more user-friendly and familiar to people with muscle memory from other systems. However, there are currently 4 presets available, which can be easily switched with the built-in app called "Change your style"<br><br>
<p align="center">
  <img src="https://i.ibb.co/2YHmv8KD/default.png" alt="default" with="500" height="500"/><br>
  Default look and feel<br><br>
  <img src="https://i.ibb.co/7tLJNr9m/windowish.png" alt="default" with="500" height="500"/><br>
  Windows-like look and feel<br><br>
  <img src="https://i.ibb.co/W4rtmM60/ubunexin.png" alt="default" with="500" height="500"/><br>
  Ubuntu-like look and feel<br><br>
  <img src="https://i.ibb.co/5wHkTYZ/gnome.png" alt="default" with="500" height="500"/><br>
  Pure GNOME look and feel<br><br>
</p>

<h2>Is it noob-friendly?</h2>
Hell nah brother, it's still a non-immutable Arch. It's at most lazy-friendly.

<h2>Can I just compile the package from this GitHub?</h2>
<p>
Absolutely. Using ArchISO tool, you should be able to get the newest build of Linexin ready to go. However, remember that this is a development build. It may not be as stable as the selected version uploaded for
<a href="https://petexy.github.io/Linexin">download</a>.
</p>

<h2>Does it support [...] language?</h2>
There are a couple of fully supported languages:
<br><ul>
<br>
  <li>English</li>
  <li>French</li>
  <li>German</li>
  <li>Hindi</li>
  <li>Polish</li>
  <li>Portuguese (BR)</li>
  <li>Russian</li>
  <li>Spanish</li>
  <li>Chinese</li>
</ul>
Other languages are not yet fully supported by Linexin apps.<br>

<h2>Common Issues</h2>
 <dl>
  <li><b>Sound is not working under 30% volume</b></li>
  <dd>Open terminal and enter "sudo linexin-sound-fix-usb-dac". This is a common problem with some USB DACs on Linux and in that case the fix will use software mixer instead of hardware mixer.</dd>
</dl> 

<br><br><br>
This is a fork of [ArchISO](https://github.com/archlinux/archiso)
