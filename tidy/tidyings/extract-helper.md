# extract-helper

_Source: Beck, "Helper"; Fowler, Duplicated Code._

**Problem:** the same logic shape copied in several places; a fix applied to one copy misses the others.
**Move:** extract one helper named for the shared idea and call it from every copy.
**Signals:** clones from the language pack's duplication tool, within one domain; three or more copies, or two copies of something non-trivial.
**Skip when:** the copies live in different domains and may reasonably diverge (coincidental duplication); the helper would need flags to cover the differences between copies (then it is not one idea).
**Improves:** reusability (duplicated lines), modifiability (one place to change).
**Typical size:** small to medium.
