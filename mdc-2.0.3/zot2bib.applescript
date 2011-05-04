on run arguments
	set theDocFilePath to first item of arguments -- the references database .bib file, or empty to create a new one
	set thePubFilePath to second item of arguments -- the new, temporary, single-reference .bib file
	set doOpenPub to (third item of arguments is equal to "true")
	set doBringToFront to (fourth item of arguments is equal to "true")
	set doAddbraces to (fifth item of arguments is equal to "true")
	
	set readFile to open for access POSIX file thePubFilePath
	set pubData to read readFile as «class utf8»
	close access readFile
	
	if theDocFilePath is not equal to "" then set theDocFile to POSIX file theDocFilePath
	
	tell application "BibDesk"
		if theDocFilePath is equal to "" then
			set theDoc to make new document
		else
			open theDocFile
			set theDoc to get first document
		end if
		tell theDoc
			set newPub to make new publication at the end of publications
			tell newPub
				set BibTeX string to pubData
				set cite key to generated cite key as string -- 'as string' is seemingly required under Tiger
				if doAddbraces then set title to "{" & title & "}"
			end tell
			if doOpenPub then show newPub -- pop up reference in own window
		end tell
		if doBringToFront then activate -- bring BibDesk to front
	end tell
end run